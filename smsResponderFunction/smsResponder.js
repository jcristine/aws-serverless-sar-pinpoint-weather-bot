/*
  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
  Permission is hereby granted, free of charge, to any person obtaining a copy of this
  software and associated documentation files (the "Software"), to deal in the Software
  without restriction, including without limitation the rights to use, copy, modify,
  merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
  INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
  PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

'use strict'

const AWS = require('aws-sdk')
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' })

const { getWeather } = require('./getWeather')
const KEYWORD = 'weather'

const validateZipCode = function (elementValue){
  let zipCodePattern = /^\d{5}$|^\d{5}-\d{4}$/
   return zipCodePattern.test(elementValue)
}

const sendSMS = async function (SMSparams) {
	const pinpoint = new AWS.Pinpoint()
	console.log('sendSMS called: ', SMSparams)

	return new Promise((resolve, reject) => {
		pinpoint.sendMessages(SMSparams, function(err, data) {
			if(err) {
				console.error(err)
				reject(err)
			} else {
				console.log("Message sent. Data: ", data)
				resolve(data)
			}
		})
	})
}

const sendVoice = async function (VoiceParams) {
	const pinpointsmsvoice = new AWS.PinpointSMSVoice();
	console.log('sendVoice called: ', VoiceParams)

	return new Promise((resolve, reject) => {

		pinpointsmsvoice.sendVoiceMessage(VoiceParams, function(err, data) {
			if(err) {
				console.error(err)
				reject(err)
			} else {
				console.log("Voice message sent. Data: ", data)
				resolve(data)
			}
		})
	})
}

const smsResponder = async (event) => {

	const msg = JSON.parse(event.Sns.Message)
	const msgWords = msg.messageBody.split(" ")

	// Check the first word of the text message is the keyword
	if (msgWords[0].toLowerCase() !== KEYWORD) return console.log('No keyword found - exiting')

	// Validate zip code and get the weather
	let message =''
	const zipCode = msgWords[1]

	if (validateZipCode(zipCode)) {
		message = await getWeather(zipCode)
	} else {
		message = 'Invalid zip code - text me in the format "weather 00000".'
	}

	// Send the SMS response
	const SMSparams = {
		ApplicationId: process.env.ApplicationId,
		MessageRequest: {
			Addresses: {
				[msg.originationNumber]: {
					ChannelType: 'SMS'
				}
			},
			MessageConfiguration: {
				SMSMessage: {
					Body: 'Ok - calling you with that information, be sure and take the call from (872) 259-5491', // message
					MessageType: 'PROMOTIONAL',
					OriginationNumber: msg.destinationNumber
				}
			}
		}
	}

	// Send the Voice response
	const VoiceParams = {
		Content: {
		  SSMLMessage: {
			LanguageCode: 'en-US',
			Text: '<speak>' + message + '</speak>',
			VoiceId: 'Joanna'
		  }
		},
		DestinationPhoneNumber: msg.originationNumber,
		OriginationPhoneNumber: msg.destinationNumber
	};

	console.log(await sendSMS(SMSparams))
	return console.log(await sendVoice(VoiceParams))
}

module.exports = { smsResponder }
