import { Modules } from "@medusajs/framework/utils"
import { linkSalesChannelsToApiKeyWorkflow } from "@medusajs/core-flows"

type ExecArgs = {
  container: any
}

export default async function linkApiKeyToSalesChannel({
  container,
}: ExecArgs) {
  const logger = container.resolve("logger")
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const apiKeyModuleService = container.resolve(Modules.API_KEY)

  // Get the default sales channel
  const salesChannels = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })

  if (!salesChannels.length) {
    logger.error("Default Sales Channel not found. Please run seed script first.")
    return
  }

  const defaultSalesChannel = salesChannels[0]
  logger.info(`Found sales channel: ${defaultSalesChannel.id}`)

  // Find the publishable API key by the key value
  const publishableKey = "pk_dc3858636260f25d5d397467ebc1021ca5b20fe5c5fd950d8a9655d2dfbdc980"
  
  const apiKeys = await apiKeyModuleService.listApiKeys({
    token: publishableKey,
  })

  if (!apiKeys.length) {
    logger.error(`Publishable API key not found: ${publishableKey}`)
    return
  }

  const apiKey = apiKeys[0]
  logger.info(`Found API key: ${apiKey.id}`)

  // Link the API key to the sales channel
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: apiKey.id,
      add: [defaultSalesChannel.id],
    },
  })

  logger.info("Successfully linked publishable API key to sales channel!")
}

