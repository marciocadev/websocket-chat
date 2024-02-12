import { WebSocketApi, WebSocketStage } from '@aws-cdk/aws-apigatewayv2-alpha';
import { WebSocketLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as cdk from 'aws-cdk-lib';
import { CfnApi, CfnDeployment, CfnIntegration, CfnRoute, CfnStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { join } from 'path';

export class WebsocketChatStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new WebSocketApi(this, "webSocket", {

      //apiName: "webSocket",
    });

    const stage = new WebSocketStage(this, "Stage", {
      webSocketApi: api,
      stageName: "dev",
      autoDeploy: true,
    });

    new cdk.CfnOutput(this, "url", {
      value: stage.url,
      exportName: "url"
    });
    new cdk.CfnOutput(this, "callbackUrl", {
      value: stage.callbackUrl,
      exportName: "callbackUrl"
    });

    // const api = new CfnApi(this, "websocket", {
    //   name: "webSocket",
    //   protocolType: "WEBSOCKET",
    //   routeSelectionExpression: "$request.body.action",
    // });

    // table
    const table = new Table(this, "table", {
      tableName: "ConnectionIdTable",
      partitionKey: {
        name: "ConnectionId",
        type: AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // connect lambda
    const connectFunc = new NodejsFunction(this, 'connectFunc', {
      handler: 'handler',
      entry: join(__dirname, 'lmb/connect.ts'),
      environment: {
        TABLE_NAME: table.tableName,
      }
    });
    table.grantWriteData(connectFunc);

    api.addRoute("$connect", {
      integration: new WebSocketLambdaIntegration("connect", connectFunc),
    })

    // disconnect lambda
    const disconnectFunc = new NodejsFunction(this, 'disconnectFunc', {
      handler: 'handler',
      entry: join(__dirname, 'lmb/disconnect.ts'),
      environment: {
        TABLE_NAME: table.tableName,
      }
    });
    table.grantWriteData(disconnectFunc);

    api.addRoute("$disconnect", {
      integration: new WebSocketLambdaIntegration("disconnect", disconnectFunc),
    });

    // message lambda
    const messageFunc = new NodejsFunction(this, 'messageFunc', {
      handler: 'handler',
      entry: join(__dirname, 'lmb/message.ts'),
      environment: {
        TABLE_NAME: table.tableName,
        ENDPOINT_URL: stage.callbackUrl,
      },
      timeout: cdk.Duration.minutes(1),
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["execute-api:ManageConnections", "execute-api:Invoke"],
          resources: ["*"]
        })
      ],
      bundling: {
        sourceMap: true
      }
    });
    table.grantWriteData(messageFunc);
    table.grantReadData(messageFunc);

    api.addRoute("sendpublicmessage", {
      integration: new WebSocketLambdaIntegration("sendpublicmessage", messageFunc),
    });

    // set name lambda
    const setNameFunc = new NodejsFunction(this, 'setNameFunc', {
      handler: 'handler',
      entry: join(__dirname, 'lmb/setName.ts'),
      timeout: cdk.Duration.minutes(1),
      environment: {
        TABLE_NAME: table.tableName,
      },
      bundling: {
        sourceMap: true
      }
    });
    table.grantWriteData(setNameFunc);

    api.addRoute("setname", {
      integration: new WebSocketLambdaIntegration("setname", setNameFunc),
    });

    // // role for apiGw to invoke the lambdas
    // const role = new Role(this, "gtwrole", {
    //   assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    // });
    // role.addToPolicy(
    //   new PolicyStatement({
    //     effect: Effect.ALLOW,
    //     resources: [
    //       connectFunc.functionArn,
    //       disconnectFunc.functionArn,
    //       messageFunc.functionArn,
    //       setNameFunc.functionArn,
    //     ],
    //     actions: ["lambda:InvokeFunction"]
    //   })
    // )

    // // integration
    // const connectIntegration = new CfnIntegration(this, 'connectIntegration', {
    //   apiId: api.attrApiId,
    //   integrationType: "AWS_PROXY",
    //   integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${connectFunc.functionArn}/invocations`,
    //   credentialsArn: role.roleArn
    // })
    // const disconnectIntegration = new CfnIntegration(this, 'disconnectIntegration', {
    //   apiId: api.attrApiId,
    //   integrationType: "AWS_PROXY",
    //   integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${disconnectFunc.functionArn}/invocations`,
    //   credentialsArn: role.roleArn
    // })
    // const messageIntegration = new CfnIntegration(this, 'messageIntegration', {
    //   apiId: api.attrApiId,
    //   integrationType: "AWS_PROXY",
    //   integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${messageFunc.functionArn}/invocations`,
    //   credentialsArn: role.roleArn
    // })
    // const setNameIntegration = new CfnIntegration(this, 'setNameIntegration', {
    //   apiId: api.attrApiId,
    //   integrationType: "AWS_PROXY",
    //   integrationUri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${setNameFunc.functionArn}/invocations`,
    //   credentialsArn: role.roleArn
    // })

    // // route
    // const connectRoute = new CfnRoute(this, "connectRoute", {
    //   apiId: api.attrApiId,
    //   routeKey: "$connect",
    //   authorizationType: "NONE",
    //   target: "integrations/" + connectIntegration.ref
    // });
    // const diconnectRoute = new CfnRoute(this, "diconnectRoute", {
    //   apiId: api.attrApiId,
    //   routeKey: "$disconnect",
    //   authorizationType: "NONE",
    //   target: "integrations/" + disconnectIntegration.ref
    // });
    // const messageRoute = new CfnRoute(this, "messageRoute", {
    //   apiId: api.attrApiId,
    //   routeKey: "sendpublicmessage",
    //   authorizationType: "NONE",
    //   target: "integrations/" + messageIntegration.ref
    // });
    // const setNameRoute = new CfnRoute(this, "setNameRoute", {
    //   apiId: api.attrApiId,
    //   routeKey: "setname",
    //   authorizationType: "NONE",
    //   target: "integrations/" + setNameIntegration.ref
    // });

    // // deployment
    // const deploy = new CfnDeployment(this, "deployment", {
    //   apiId: api.attrApiId
    // })
    // new CfnStage(this, "stage", {
    //   apiId: api.attrApiId,
    //   stageName: "dev",
    //   deploymentId: deploy.attrDeploymentId,
    //   autoDeploy: true
    // });

    // // need three routes ready before apideployment
    // deploy.node.addDependency(connectRoute);
    // deploy.node.addDependency(diconnectRoute);
    // deploy.node.addDependency(messageRoute);
    // deploy.node.addDependency(setNameRoute);

    // // output
    // new cdk.CfnOutput(this, "output", {
    //   exportName: "wssEndpoint",
    //   value: `http://${api.attrApiId}.execute-api.${this.region}.amazonaws.com/dev`,
    // })
  }
}
