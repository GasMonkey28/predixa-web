import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

import { config } from '@/lib/server/config'

const client = new DynamoDBClient({
  region: config.aws.region,
  credentials:
    config.aws.accessKeyId && config.aws.secretAccessKey
      ? {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        }
      : undefined,
})

const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = process.env.TRADESTATION_CONNECTIONS_TABLE || 'TradeStationConnections'

export interface TradeStationConnection {
  userId: string
  accessToken: string
  refreshToken: string
  expiresAt: string
  scope?: string
  accountIds: string[]
  selectedAccountId: string | null
  updatedAt: string
}

export async function getTradeStationConnection(
  userId: string
): Promise<TradeStationConnection | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId },
    })
  )
  return (result.Item as TradeStationConnection | undefined) ?? null
}

export async function saveTradeStationConnection(
  connection: TradeStationConnection
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: connection,
    })
  )
}

export async function deleteTradeStationConnection(userId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { userId },
    })
  )
}
