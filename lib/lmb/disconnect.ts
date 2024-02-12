import { DynamoDBClient, DeleteItemCommand, DeleteItemCommandInput } from "@aws-sdk/client-dynamodb";

const dbclient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event: any) => {

  const input: DeleteItemCommandInput = {
    Key: {
      ConnectionId: {
        S: event["requestContext"]["connectionId"]
      }
    },
    TableName: process.env.TABLE_NAME
  }
  await dbclient.send(new DeleteItemCommand(input));
  return {
    statusCode: 200,
  }
}