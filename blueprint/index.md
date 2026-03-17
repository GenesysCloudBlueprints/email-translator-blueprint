---
title: Build an email translation assistant with the AWS Translate service
author: agnes.corpuz
indextype: blueprint
icon: blueprint
image: images/flowchart.png
category: 5
summary: |
  This Genesys Cloud Developer Blueprint provides instructions for building an email translation assistant which uses the AWS Translate service to allow customers and agents to email in their preferred languages. The email translation assistant automatically translates everything in the interaction window in real-time.
---
:::{"alert":"primary","title":"About Genesys Cloud Blueprints","autoCollapse":false} 
Genesys Cloud blueprints were built to help you jump-start building an application or integrating with a third-party partner. 
Blueprints are meant to outline how to build and deploy your solutions, not a production-ready turn-key solution.
 
For more details on Genesys Cloud blueprint support and practices 
please see our Genesys Cloud blueprint [FAQ](https://developer.genesys.cloud/blueprints/faq)sheet.
:::

This Genesys Cloud Developer Blueprint provides instructions for building an email translation assistant which uses the AWS Translate service to allow customers and agents to email in their preferred languages. The email translation assistant automatically translates everything in the interaction window in real-time.

![Email translation assistant](images/flowchart.png "Email translation assistant")

* [Solution components](#solution-components "Goes to the Solution components section")
* [Requirements](#requirements "Goes to the Requirements section")
* [Implementation steps](#implementation-steps "Goes to the Implementation steps section")
* [Additional resources](#additional-resources "Goes to the Additional resources section")

## Solution components

* **Genesys Cloud** - A suite of Genesys cloud services for enterprise-grade communications, collaboration, and contact center management. You deploy the Email Translator solution in Genesys Cloud.
* **Genesys AppFoundry** - The Genesys app marketplace for solutions that run on the Genesys Cloud platform. You download the integration used in this solution from the Genesys AppFoundry.
* **Interaction Widget integration** - The Genesys Cloud integration that enables web apps to be embedded in an iframe within Genesys Cloud. The iframe only appears on specified interaction types and to specified agents. For this solution, Genesys Cloud uses the Interaction Widget integration to show translated email messages to the customer.
* **AWS IAM** - Identity and Access Management that controls access to AWS resources such as services or features. In this solution, you set the permissions to allow the Email Translator to access Amazon Translate and the AWS SDK.
* **Amazon Translate** - A translation service that enables cross-lingual communication between users of an application. Amazon Translate is the translation service used in the Email Translator solution.

### Software development kits (SDKs)

* **Genesys Cloud Platform API SDK** -Client libraries used to simplify application integration with Genesys Cloud by handling low-level HTTP requests. This SDK is used for the initial email interaction between agent and customer.
* **AWS for JavaScript SDK** - This SDK enables developers to build and deploy applications that use AWS services. This solution uses the JavaScript API to enable the Email Translator in an agent's browser and it uses the inside Node.js applications to enable the Email Translator on the server where Genesys Cloud runs.

## Requirements

### Specialized knowledge

* Administrator-level knowledge of Genesys Cloud
* AWS Cloud Practitioner-level knowledge of AWS IAM, AWS Translate, and AWS for JavaScript SDK
* Experience using the Genesys Cloud Platform API

### Genesys Cloud account

* A Genesys Cloud license. For more information, see [Genesys Cloud Pricing](https://www.genesys.com/pricing "Opens the Genesys Cloud pricing page") in the Genesys website.
* The Master Admin role. For more information, see [Roles and permissions overview](https://help.mypurecloud.com/?p=24360 "Opens the Roles and permissions overview article") in the Genesys Cloud Resource Center.

### AWS account

* A user account with Administrator Access permission and full access to the following services:
  * IAM service
  * Translate service

## Deployment steps

### Download the repository containing the project files

1. Clone the [email-translator-blueprint repository](https://github.com/GenesysCloudBlueprints/email-translator-blueprint "Opens the email-translator-blueprint repository in GitHub").

### Create a Code Authorization / PKCE OAuth Grant for Genesys Cloud

1. Login to your Genesys Cloud organization and create a new OAuth API (Code Authorization / PKCE). [Create an OAuth Client](https://help.mypurecloud.com/articles/create-an-oauth-client/)
2. Assign your hosted site to the Authorized redirect URIs.
3. In your local blueprint repository, open the [config.js](https://github.com/GenesysCloudBlueprints/email-translator-blueprint/blob/main/docs/scripts/config.js) file. Add the client ID from your OAuth client and specify the region where your Genesys Cloud organization is located, for example, `mypurecloud.ie` or `mypurecloud.com.au`.

### Set up AWS Translate

1. Create an IAM user for the application. For more information, see [IAM users](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html "Opens IAM users") in the AWS documentation.
2. Add a policy to the IAM that grants full access to the AWS Translate service. For more information, see [Managing IAM policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html "Opens Managing IAM policies") in the AWS documentation.
3. Create an access key for the IAM user. For more information, see [Managing access keys for IAM users](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html "Opens Managing access keys for IAM users") in the AWS documentation.
4. Write down the access key and secret.
5. Create an .env file in the directory folder and provide values for the following variables: `AWS_REGION`, `AWS_ACCESS_KEY_ID`,  `AWS_SECRET_ACCESS_KEY`, `GENESYSCLOUD_OAUTHCLIENT_ID`, `GENESYSCLOUD_OAUTHCLIENT_SECRET`, and `GENESYSCLOUD_REGION`.

  :::primary
  **Tip**: Start with the sample.env file for this blueprint and provide your org-specific details.
  :::

### Install and activate the Email Translator in Genesys Cloud

1. Log in to your Genesys Cloud organization and add an integration. For more information, see [Add an integration](https://help.mypurecloud.com/?p=135807 "Opens the Add an integration article") in the Genesys Cloud Resource Center.

   ![Add integration](images/add-integration.png "Add integration")

2. Install the **Interaction Widget** integration. For more information, see [Set up an Interaction Widget integration](https://help.mypurecloud.com/?p=229319 "Opens the Set up an Interaction Widget integration article") in the Genesys Cloud Resource Center.

   ![Install Interaction Widget](images/install-interaction-widget.png "Install Interaction Widget")

3. (Optional) Use the **Name** box to give the widget a meaningful name. For example, **Email Translator**.

   ![Interaction Widget name](images/name-interaction.png "Interaction Widget name")

4. Click the **Configuration** tab.
5. In the **Application URL** box, type the URL of the web application. Be sure to specify the full URL, beginning with `https:`.

  ```
   https://localhost/?conversationid={{gcConversationId}}&language={{gcLangTag}}
  ```

   The `gcConversationId` parameter determines the conversation interaction. The `gcLangTag` parameter determines the agent's language in the Email Translator solution.

6. To limit access to specific groups of agents, in **Group Filtering**, select the groups that can use the widget.
7. To limit access to specific queues, click **Select Queues** and select the queues that can use the widget.
8. In the **Communication Type Filtering** box, type **email**.  

   ![Interaction configuration](images/interaction-config.png "Interaction configuration")

9. Click **Advanced** and enter the following code in the text area. Then save and activate the integration.

  ```{"language":"json"}
     {
       "lifecycle": {
         "ephemeral": false,
         "hooks": {
           "stop": true,
           "blur": true,
           "focus": true,
           "bootstrap": true
         }
       },
       "icon": {
          "48x48": "https://raw.githubusercontent.com/GenesysCloudBlueprints/email-translator-blueprint/main/blueprint/images/email-48x48.png",
          "96x96": "https://raw.githubusercontent.com/GenesysCloudBlueprints/email-translator-blueprint/main/blueprint/images/email-96x96.png",
          "128x128": "https://raw.githubusercontent.com/GenesysCloudBlueprints/email-translator-blueprint/main/blueprint/images/email-128x128.png",
          "256x256": "https://raw.githubusercontent.com/GenesysCloudBlueprints/email-translator-blueprint/main/blueprint/images/email-256x256.png"
      },
       "monochromicIcon": {
         "vector": "https://raw.githubusercontent.com/GenesysCloudBlueprints/email-translator-blueprint/main/blueprint/images/email.svg"
       }
     }
  ```

### Host and run the Node.js app server

1. At a command line, verify that you are running Node.js v14.15.4 or later. Open a command line tool and type `node-v`.
  * To upgrade, type `nvm install 14.15.4`.
  * To install the latest version, type `npm install -g n latest`.


2. Switch to the directory where the files for your Email Translator project are located and install the dependencies in the local node-modules folder. In the command line, type `npm install`.
3. To run the server locally, in the command line type `node run-local.js`.

### Set up an email interaction

1. Log in to your Genesys Cloud organization and add a domain if you do not already have one.
2. Add an email address to the domain.
  * Under Email Routing, select the queue you specified when you [installed and activated the Email Translator](#install-and-activate-the-Email-Translator-in-Genesys-Cloud "Goes to the Install and activate the Email Translator in Genesys Cloud section").

For more information, see [Send and receive emails directly with the myPureCloud.com domain](https://help.mypurecloud.com/articles/send-and-receive-emails-directly-with-the-mypurecloud-com-domain/ "Opens the Send and receive emails directly with the myPureCloud.com domain article") in the Genesys Cloud Resource Center.

### Test the solution

1. To start an email interaction as a customer, send an email to the email address you configured earlier.
   ![Send email](images/send-email.png "Send email")
2. To answer the email as an agent, in your Genesys Cloud organization change your status to **On Queue** and then answer the incoming interaction.
  ![Email interaction](images/email-interaction.png "Incoming email interaction")
3. To open the Email Translator, click the **Email Translator** button which appears in the agent's toolbar.
4. Upon loading the Email Translator, the agent can see a message bubble with the translated message from the customer.

  :::primary
  **Tip**: The **Copy** button translates the agent's response into the customer's language and adds the translated response to the clipboard. The agent can then paste the translated response in the email response window before sending it.

  The **Send** button sends the agent's translated response to the customer and ends the interaction.
  :::

  ![Translated email](images/email-translate.png "Translated email")

## Additional resources

* [Genesys Cloud Platform Client SDK](https://developer.mypurecloud.com/api/rest/client-libraries/ "Opens the Genesys Cloud Platform Client SDK page")
* [Genesys AppFoundry](https://appfoundry.genesys.com/filter/genesyscloud "Opens the Genesys AppFoundry")
* [Amazon Translate](https://aws.amazon.com/translate/ "Opens Amazon Translate page") in the AWS documentation
* [Email-translator-blueprint repository](https://github.com/GenesysCloudBlueprints/email-translator-blueprint "Opens the email-translator-blueprint repository in GitHub")
