'use strict';

const ConversationV1 = require('watson-developer-cloud/conversation/v1');
const redis = require('redis');

var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var bodyParser = require('body-parser');

require('dotenv').config();

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Using some globals for now
let conversation;
let redisClient;
let context;
let Wresponse;

var edt = require('./Data/edt.json');

function errorResponse(reason) {
	return {
	  version: '1.0',
	  response: {
		shouldEndSession: true,
		outputSpeech: {
		  type: 'PlainText',
		  text: reason || 'An unexpected error occurred. Please try again later.'
		}
	  }
	};
  }

function initClients() {
	return new Promise(function(resolve, reject) {
	// Connect a client to Watson Conversation
	conversation = new ConversationV1({
		password: process.env.WCS_Password,
        username: process.env.WCS_Username,
		version_date: '2016-09-20'
	});
	console.log('Connected to Watson Conversation');
  
	  // Connect a client to Redis 
	  redisClient = redis.createClient(process.env.redis_port, process.env.redis_url);
	  redisClient.auth(process.env.redis_auth, function (err) {
		if (err) throw err;
	});
	redisClient.on('connect', function() {
		console.log('Connected to Redis');
	});
	resolve("Done");
  });
  }

function conversationMessage(request, workspaceId) {
	return new Promise(function(resolve, reject) {
	  const input = request.inputs[0] ? request.inputs[0].rawInputs[0].query : 'start skill';
		var test = {
			input: { text: input },
			workspace_id: workspaceId,
			context: context
			//context: {}
		  };
	  console.log("Input" + JSON.stringify(test,null,2));
	  conversation.message(
		{
		  input: { text: input },
		  workspace_id: workspaceId,
		  context: context
		},
		function(err, watsonResponse) {
			console.log(watsonResponse)
		  if (err) {
			console.error(err);
			reject('Error talking to Watson.');
		  } else {
			console.log(watsonResponse);
			context = watsonResponse.context; // Update global context			
			resolve(watsonResponse);
		  }
		}
	  );
	});
  }

function getSessionContext(sessionId) {
	console.log('sessionId: ' + sessionId); 
	return new Promise(function(resolve, reject) {
	  redisClient.get(sessionId, function(err, value) {
		if (err) {
		  console.error(err);
		  reject('Error getting context from Redis.');
		}
		// set global context
		context = value ? JSON.parse(value) : {};
		console.log('---------');
		console.log('Context Recupéré:');
		console.log(context);
		console.log('---------');
		resolve();
	  });
	});
  }
  
  function saveSessionContext(sessionId) {
		console.log('---------');
		console.log('Begin saveSessionContext ' + sessionId);
  
	// Save the context in Redis. Can do this after resolve(response).
	if (context) {
	  const newContextString = JSON.stringify(context);
	  // Saved context will expire in 600 secs.
	  redisClient.set(sessionId, newContextString, 'EX', 600);
	  	console.log('Saved context in Redis');
	  	console.log(sessionId);
		console.log(newContextString);
		console.log('---------');
	}
  }

function sendResponse(response, resolve) {
		var tabEdt = []
		var message = ''

		if (response.output.status) {
				if (response.output.status == 1) {
		  			if(context.groupe) {
			  			edt.features.forEach(function(feature) {
					  		if(feature.properties['Formation'].toLowerCase().includes(context.filiere.toLowerCase())) {
					  			if(feature.properties['Intitulé'].toLowerCase().includes(context.groupe)) {
					  				var today = new Date();

					  				if(context.date) {
					  					today = new Date(context.date)
					  				}

									var dd = today.getDate();
									var mm = today.getMonth()+1;

									var yyyy = today.getFullYear();

									if(dd < 10){
									    dd = '0' + dd;
									} 
									if(mm < 10){
									    mm = '0' + mm;
									} 
									var today = yyyy + '/' + mm + '/' + dd;

									if(feature.properties['Date'] == today.toString()) {
										var properties = feature.properties

										message += ' A ' + properties['Heure début'] + ', vous avez cours de ' + properties['Intitulé'] + ', pour une durée de ' + (parseInt(properties['Durée (min)']) / 60) + ' heures, avec ' + properties['Enseignant'] + ' en salle ' + properties['Lieu'] + '.'
									}
					  			}
					  		}
						});
						
						context = {}

						if(message == '') {
							message += 'Vous n\'avez pas cours ce jour.'
						}
					}
				}

		  		if (response.output.status == 2) {
		  			if(context.groupe) {
		  				var boolean = false

			  			edt.features.forEach(function(feature) {
					  		if(feature.properties['Formation'].toLowerCase().includes(context.filiere.toLowerCase())) {
					  			if(feature.properties['Intitulé'].toLowerCase().includes(context.groupe)) {
					  				var today = new Date();

					  				if(context.date) {
					  					today = new Date(context.date)
					  				}

									var dd = today.getDate();
									var mm = today.getMonth()+1;

									var yyyy = today.getFullYear();

									if(dd < 10){
									    dd = '0' + dd;
									} 
									if(mm < 10){
									    mm = '0' + mm;
									} 
									var today = yyyy + '/' + mm + '/' + dd;

									if(feature.properties['Date'] == today.toString() && !boolean) {
										var properties = feature.properties

										message += ' Vous commencez à ' + properties['Heure début'] + '. Pensez à mettre un réveil !'
										boolean = true
									}
					  			}
					  		}
						});

						context = {}

						if(message == '') {
							message += 'Vous n\'avez pas cours ce jour.'
						}
					}
		  		}

		  		if (response.output.status == 3) {
		  			if(context.groupe) {
			  			edt.features.forEach(function(feature) {
					  		if(feature.properties['Formation'].toLowerCase().includes(context.filiere.toLowerCase())) {
					  			if(feature.properties['Intitulé'].toLowerCase().includes(context.groupe)) {
					  				var today = new Date();

					  				if(context.date) {
					  					today = new Date(context.date)
					  				}

									var dd = today.getDate();
									var mm = today.getMonth()+1;

									var yyyy = today.getFullYear();

									if(dd < 10){
									    dd = '0' + dd;
									} 
									if(mm < 10){
									    mm = '0' + mm;
									} 
									var today = yyyy + '/' + mm + '/' + dd;

									if(feature.properties['Date'] == today.toString()) {
										var properties = feature.properties

										message = ' Vous finissez à ' + parseFloat(new Date('February 5, 2001 ' + properties['Heure début']).getHours() + (parseFloat(properties['Durée (min)']) / 60)) + ' heures.'
									}
					  			}
					  		}
						});

						context = {}

						if(message == '') {
							message += 'Vous n\'avez pas cours ce jour.'
						}
					}
		  		}

		  		if (response.output.status == 4) {
		  			if(context.groupe) {
		  				var boolean = false

			  			edt.features.forEach(function(feature) {
					  		if(feature.properties['Formation'].toLowerCase().includes(context.filiere.toLowerCase())) {
					  			if(feature.properties['Intitulé'].toLowerCase().includes(context.cours.toLowerCase()) && feature.properties['Intitulé'].toLowerCase().includes(context.groupe) && !boolean) {
										var properties = feature.properties

										message = ' Le prochain cours de ' + properties['Intitulé'] + ' est le ' + properties['Date'] + ' à ' + properties['Heure début'] + '.'
										boolean = true
					  			}
					  		}
						});

						context = {}

						if(message == '') {
							message += 'Vous n\'avez pas ce cours.'
						}
					}
		  		}
		  		if (response.output.status == 5) {
		  			if(context.groupe) {
			  			edt.features.forEach(function(feature) {
					  		if(feature.properties['Formation'].toLowerCase().includes(context.filiere.toLowerCase())) {
					  			if(feature.properties['Intitulé'].toLowerCase().includes(context.groupe) && feature.properties['Intitulé'].toLowerCase().includes(context.groupe)) {
					  				var today = new Date();

					  				if(context.date) {
					  					today = new Date(context.date)
					  				}

									var dd = today.getDate();
									var mm = today.getMonth()+1;

									var yyyy = today.getFullYear();

									if(dd < 10){
									    dd = '0' + dd;
									} 
									if(mm < 10){
									    mm = '0' + mm;
									} 
									var today = yyyy + '/' + mm + '/' + dd;

									if(feature.properties['Date'] == today.toString()) {
										var properties = feature.properties

										message = ' Ce cours à lieu en salle ' + properties['Lieu']
									}
					  			}
					  		}
						});

						context = {}

						if(message == '') {
							message += 'Vous n\'avez pas cours aujourd\'hui.'
						}
					}
		  		}
		  		if (response.output.status == 6) {
		  			if(context.groupe) {
		  				var hours = 0
		  				var bool = false
		  				var date = ''
			  			edt.features.forEach(function(feature) {
					  		if(feature.properties['Formation'].toLowerCase().includes(context.filiere.toLowerCase())) {
					  			if(feature.properties['Intitulé'].toLowerCase().includes(context.groupe)) {
					  				var today = new Date();

					  				if(context.date) {
					  					today = new Date(context.date)
					  				}

									var dd = today.getDate();
									var mm = today.getMonth()+1;

									var yyyy = today.getFullYear();

									if(dd < 10){
									    dd = '0' + dd;
									} 
									if(mm < 10){
									    mm = '0' + mm;
									} 
									var today = yyyy + '/' + mm + '/' + dd;

									date = today
									if(feature.properties['Date'] == today.toString()) {
										var properties = feature.properties
										hours += properties['Durée (min)']
										bool = true
									}
					  			}
					  		}
						});
			  			if(bool){
			  				message = 'Vous avez ' + hours/60 + ' heures de cours le ' + date + '.'
			  			}else {
			  				message = ''
			  			}

						context = {}

						if(message == '') {
							message += 'Vous n\'avez pas cours'
						}
					}
		  		}
		  		if (response.output.status == 7) {
		  			if(context.groupe) {
		  				var bool = false
			  			edt.features.forEach(function(feature) {
					  		if(feature.properties['Formation'].toLowerCase().includes(context.filiere.toLowerCase())) {
					  			if(!bool && (feature.properties['Intitulé'].toLowerCase().includes("examen") || feature.properties['Intitulé'].toLowerCase().includes("ds"))) {
									message = 'Vous avez un examen de ' +feature.properties['Intitulé'] + ' le ' + feature.properties['Date'] + ' à ' + feature.properties['Heure début'] + ' en salle ' + feature.properties['Lieu']
									bool = true
					  			}
					  		}
						});
						context = {}

						if(message == '') {
							message += 'Vous n\'avez pas cours'
						}
					}
		  		}
		  		if (response.output.status == 8) {
		  			if(context.groupe) {
			  			edt.features.forEach(function(feature) {
					  		if(feature.properties['Formation'].toLowerCase().includes(context.filiere.toLowerCase())) {
					  			if(feature.properties['Intitulé'].toLowerCase().includes(context.cours.toLowerCase())) {
									message = ' L\'enseignant de ce cours se nomme ' + feature.properties['Enseignant']
					  			}
					  		}
						});

						context = {}

						if(message == '') {
							message += 'Vous n\'avez pas ce cours .'
						}
					}
		  		}
		  	}

		console.log('============================> Message ' + message)
	  // Combine the output messages into one message.
	  const output = (message == '') ? response.output.text.join(' ') : message;
	  var resp = {
		conversationToken: null,
		expectUserResponse: true,
		expectedInputs: [
			{
				inputPrompt: {
					richInitialPrompt: {
						items: [
							{
								simpleResponse: {
									textToSpeech: output,
									displayText: output
								}
							}
						],
						suggestions: []
					}
				},
				possibleIntents: [
					{
						intent: 'actions.intent.TEXT'
					}
				]
			}
		]
	};
	
	Wresponse =  resp;
	// Resolve the main promise now that we have our response
	resolve(resp);
	}

app.post('/api/google4IBM', function(args, res) {
	return new Promise(function(resolve, reject) {
	  const request = args.body;
	  console.log('==========================================>   ' + args.body)
	  console.log("Google Home is calling");
	  console.log(JSON.stringify(request,null,2));
	  const sessionId = args.body.conversation.conversationId;
	  initClients()
	  .then(() => getSessionContext(sessionId))
	  .then(() => conversationMessage(request, process.env.workspace_id))
	  .then(actionResponse => sendResponse(actionResponse, resolve))
	  .then(data => {
		res.setHeader('Content-Type', 'application/json');
		res.append("Google-Assistant-API-Version", "v2");
		res.json(Wresponse);
	})
	.then(() => saveSessionContext(sessionId))    
	.catch(function (err) {
		console.error('Erreur !');
		console.dir(err);
	});
	});
  });

/*
	res.setHeader('Content-Type', 'application/json')
	res.append("Google-Assistant-API-Version", "v2")
*/


// start the server
app.listen(port);
console.log('Server started! At http://localhost:' + port);