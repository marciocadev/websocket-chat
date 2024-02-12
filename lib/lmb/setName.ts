import { DynamoDBClient, UpdateItemCommand, UpdateItemCommandInput } from "@aws-sdk/client-dynamodb";
import { ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';
import 'source-map-support/register'

const dbclient = new DynamoDBClient({ region: process.env.AWS_REGION });
const gwclietn = new ApiGatewayManagementApiClient({
  endpoint: process.env.ENDPOINT_URL
});

export const handler = async (event: any) => {

  const data = JSON.parse(event.body);

  const input: UpdateItemCommandInput = {
    TableName: process.env.TABLE_NAME,
    Key: {
      ConnectionId: {
        S: event["requestContext"]["connectionId"]
      }
    },
    UpdateExpression: "SET #name = :name",
    ExpressionAttributeNames: {
      '#name': 'name'
    },
    ExpressionAttributeValues: {
      ":name": { S: data.message }
    },
    ReturnValues: 'ALL_NEW'
  }
  await dbclient.send(new UpdateItemCommand(input));

  return {
    statusCode: 200,
  }
}