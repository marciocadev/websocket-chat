import { DynamoDBClient, ScanCommand, ScanCommandInput, GetItemCommand, GetItemCommandInput } from "@aws-sdk/client-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand, PostToConnectionCommandInput } from '@aws-sdk/client-apigatewaymanagementapi';
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import 'source-map-support/register'

const dbclient = new DynamoDBClient({ region: process.env.AWS_REGION });
const gwclietn = new ApiGatewayManagementApiClient({
  endpoint: process.env.ENDPOINT_URL
});

export const handler = async (event: any) => {

  const inputGet: GetItemCommandInput = {
    TableName: process.env.TABLE_NAME,
    Key: marshall({ ConnectionId: event["requestContext"]["connectionId"] })
  }
  const senderData = await dbclient.send(new GetItemCommand(inputGet));
  const sender = unmarshall(senderData.Item!)

  const data = JSON.parse(event.body)

  let connections: any[] = [];
  const inputScan: ScanCommandInput = {
    TableName: process.env.TABLE_NAME
  }
  const items = await dbclient.send(new ScanCommand(inputScan));
  for (let i of items.Items!) {
    connections.push(i)
  }

  for (let id of connections) {
    const u = unmarshall(id);
    console.log(u.name)
    await gwclietn.send(new PostToConnectionCommand({
      ConnectionId: u.ConnectionId,
      Data: u.ConnectionId === event["requestContext"]["connectionId"] ?
        Buffer.from(data.message) :
        Buffer.from(`${sender.name} send ${data.message}`)
    }))
  }

  return {
    statusCode: 200,
  }
}