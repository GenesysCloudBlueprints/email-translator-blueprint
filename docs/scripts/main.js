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

// Check if we have a token from the OAuth callback redirect
const token = urlParams.get('token');
const stateParam = urlParams.get('state');

client.setPersistSettings(true, 'chat-translator');
client.setEnvironment(config.genesysCloud.region);

if (token) {
    // Token was provided by the server after code exchange
    client.setAccessToken(token);

    // Parse state to recover conversationId and language
    let stateData = JSON.parse(decodeURIComponent(stateParam));
    currentConversationId = stateData.conversationId;
    genesysCloudLanguage = stateData.language;

    // Continue with the existing flow
    conversationsApi.getConversationsEmail(currentConversationId)
    .then(data => {
        console.log(data);
        messageId = data.participants.find(p => p.purpose == 'customer').messageId;
        return conversationsApi.getConversationsEmailMessage(currentConversationId, messageId);
    }).then((data) => {
        console.log(data);
        return getEmailDetails(data);
    }).then(data => {
        console.log('Finished Setup');
    }).catch(e => console.log(e));

} else {
    // No token yet — redirect to Genesys Cloud authorize endpoint
    currentConversationId = urlParams.get('conversationid');
    genesysCloudLanguage = urlParams.get('language');

    const state = JSON.stringify({
        conversationId: currentConversationId,
        language: genesysCloudLanguage
    });

    const authorizeUrl = `https://login.${config.genesysCloud.region}/oauth/authorize`
        + `?response_type=code`
        + `&client_id=${config.clientID}`
        + `&redirect_uri=${encodeURIComponent(config.redirectUri)}`
        + `&state=${encodeURIComponent(state)}`;

    window.location.replace(authorizeUrl);
}
