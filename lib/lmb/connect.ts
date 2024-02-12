import { DynamoDBClient, PutItemCommand, PutItemCommandInput } from "@aws-sdk/client-dynamodb";

const dbclient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: any) => {

  console.log(JSON.stringify(event, undefined, 2))

  const input: PutItemCommandInput = {
    Item: {
      ConnectionId: {
        S: event["requestContext"]["connectionId"]
      }
    },
    TableName: process.env.TABLE_NAME
  }
  await dbclient.send(new PutItemCommand(input));
  return {
    statusCode: 200,
  }
}