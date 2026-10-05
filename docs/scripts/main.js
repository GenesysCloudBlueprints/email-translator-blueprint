import view from './view.js';
import translate from './translate-service.js';
import config from './config.js';

// Obtain a reference to the platformClient object
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;

// API instances
const conversationsApi = new platformClient.ConversationsApi();
let currentConversationId = '';
let translationData = null;
let genesysCloudLanguage = 'en-us';
let messageId = '';
let customerEmail = '';
let customerName = '';
let agentEmail = '';
let agentName = '';
let subject = '';

function getEmailDetails(data){
    let emailBody = data.textBody;

    // Get email details
    customerEmail = data.from.email;
    customerName = data.from.name;
    agentEmail  = data.to[0].email;
    agentName = data.to[0].name;
    subject = data.subject;

    translateMessage(emailBody, genesysCloudLanguage, 'customer')
    .then((translatedData) => {
        translationData = translatedData;
    });
}

function translateMessage(message, language, purpose){
    return new Promise((resolve, reject) => {
        translate.translateText(message, language, function(data) {
            if (data) {
                console.log('TRANSLATED DATA: ' + JSON.stringify(data));

                view.addMessage(data.translated_text, purpose);
                resolve(data);
            }
        });
    });
}

function sendMessage(){
    let message = document.getElementById('message-textarea').value;

    translateMessage(message, getSourceLanguage(), 'agent')
    .then((translatedData) => {
        let body = {
            'to': [{
                'email': customerEmail,
                'name': customerName
            }],
            'from': {
                'email': agentEmail,
                'name': agentName
            },
            'subject': subject,
            'textBody': translatedData.translated_text,
            'historyIncluded': true
        }
    
        conversationsApi.postConversationsEmailMessages(currentConversationId, body);

        console.log('Translated email sent to customer!');
    });    
}

function copyToClipboard(){
    let message = document.getElementById('message-textarea').value;

    translateMessage(message, getSourceLanguage(), 'agent')
    .then((translatedData) => {
        var dummy = document.createElement('textarea');
        document.body.appendChild(dummy);
        dummy.value = translatedData.translated_text;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);

        console.log('Translated message copied to clipboard!');
    });
}

function getSourceLanguage(){
    let sourceLang;

    // Default language to english if no source_language available    
    if(translationData === null) {
        sourceLang = 'en';
    } else {
        sourceLang = translationData.source_language;
    }

    return sourceLang;
}

/** --------------------------------------------------------------
 *                       EVENT HANDLERS
 * -------------------------------------------------------------- */
document.getElementById('btn-send')
    .addEventListener('click', () => sendMessage());

document.getElementById('btn-copy')
    .addEventListener('click', () => copyToClipboard());

/** --------------------------------------------------------------
 *                       INITIAL SETUP
 * -------------------------------------------------------------- */
const urlParams = new URLSearchParams(window.location.search);
currentConversationId = urlParams.get('conversationid');
genesysCloudLanguage = urlParams.get('language');

const serverOrigin = new URL(config.redirectUri).origin;

client.setPersistSettings(true, 'chat-translator');
client.setEnvironment(config.genesysCloud.region);

// Check if we have a token from the OAuth callback
const token = urlParams.get('token');

let authPromise;
if (token) {
    // Token was provided by the server after code exchange
    client.setAccessToken(token);
    const stateParam = urlParams.get('state') || '{}';
    authPromise = Promise.resolve({ state: stateParam });
} else {
    // No token — Genesys Cloud sandboxes this iframe without top-navigation
    // rights, so we can't redirect the widget itself to the login page.
    // Show a login button; the click opens the OAuth flow in a popup, and
    // once the popup lands back on our own origin with a token, we read it
    // straight off the popup's URL and close it.
    const loginOverlay = document.getElementById('login-overlay');
    loginOverlay.style.display = 'flex';

    authPromise = new Promise((resolve, reject) => {
        document.getElementById('login-btn').addEventListener('click', () => {
            const state = JSON.stringify({
                conversationId: currentConversationId,
                language: genesysCloudLanguage
            });
            const loginUrl = `https://login.${config.genesysCloud.region}/oauth/authorize`
                + `?response_type=code`
                + `&client_id=${config.clientID}`
                + `&redirect_uri=${encodeURIComponent(config.redirectUri)}`
                + `&state=${encodeURIComponent(state)}`;

            const popup = window.open(loginUrl, 'gc-oauth-login', 'width=500,height=700');
            if (!popup) {
                reject(new Error('Login popup was blocked. Please allow popups for this site and try again.'));
                return;
            }

            const poll = setInterval(() => {
                if (popup.closed) {
                    clearInterval(poll);
                    reject(new Error('Login popup was closed before completing sign-in.'));
                    return;
                }

                // Reading popup.location throws while it's still on a
                // foreign origin (the Genesys Cloud login pages) —
                // that's expected, just keep polling.
                let popupUrl;
                try { popupUrl = new URL(popup.location.href); } catch (e) { return; }
                if (popupUrl.origin !== serverOrigin) return;

                const popupToken = popupUrl.searchParams.get('token');
                if (!popupToken) return; // back on our origin, but the backend hasn't redirected with a token yet

                clearInterval(poll);
                popup.close();
                client.setAccessToken(popupToken);
                loginOverlay.style.display = 'none';
                resolve({ state: popupUrl.searchParams.get('state') || '{}' });
            }, 500);
        });
    });
}

authPromise
.then(data => {
    // Parse state to recover conversationId and language
    let stateData = {};
    try { stateData = JSON.parse(data.state); } catch (e) {}
    currentConversationId = stateData.conversationId || currentConversationId;
    genesysCloudLanguage = stateData.language || genesysCloudLanguage;

    // Continue with the existing flow
    return conversationsApi.getConversationsEmail(currentConversationId);
}).then(data => {
    console.log(data);
    messageId = data.participants.find(p => p.purpose == 'customer').messageId;
    return conversationsApi.getConversationsEmailMessage(currentConversationId, messageId);
}).then((data) => {
    console.log(data);
    return getEmailDetails(data);
}).then(data => {
    console.log('Finished Setup');
}).catch(e => console.log(e));
