import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ProductStatus } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { createProductCategoriesWorkflow } from "@medusajs/medusa/core-flows"

type ExecArgs = {
  container: any
}

export default async function replaceProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)

  logger.info("Replacing products with peptides...")

  // Get default sales channel
  const salesChannels = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })

  if (!salesChannels.length) {
    logger.error("Default Sales Channel not found. Please run seed script first.")
    return
  }

  const defaultSalesChannel = salesChannels[0]

  // Get shipping profile
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })

  if (!shippingProfiles.length) {
    logger.error("No shipping profiles found. Please run seed script first.")
    return
  }

  const shippingProfile = shippingProfiles[0]

  // Get or create categories using query API
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })

  let peptidesCategory = existingCategories.find((cat: any) => cat.name === "Peptides")
  let topicalsCategory = existingCategories.find((cat: any) => cat.name === "Topicals")

  if (!peptidesCategory || !topicalsCategory) {
    try {
      const { result: categoryResult } = await createProductCategoriesWorkflow(
        container
      ).run({
        input: {
          product_categories: [
            {
              name: "Peptides",
              is_active: true,
            },
            {
              name: "Topicals",
              is_active: true,
            },
            {
              name: "Supplements",
              is_active: true,
            },
          ],
        },
      })
      peptidesCategory = categoryResult.find((cat) => cat.name === "Peptides")
      topicalsCategory = categoryResult.find((cat) => cat.name === "Topicals")
    } catch (error: any) {
      // If categories already exist, fetch them again
      if (error.message?.includes("already exists")) {
        const { data: updatedCategories } = await query.graph({
          entity: "product_category",
          fields: ["id", "name"],
        })
        peptidesCategory = updatedCategories.find((cat: any) => cat.name === "Peptides")
        topicalsCategory = updatedCategories.find((cat: any) => cat.name === "Topicals")
      } else {
        throw error
      }
    }
  }

  const categoryResult = [peptidesCategory, topicalsCategory].filter(Boolean)

  // Peptide products list
  const peptides = [
    "MK677",
    "Mots c",
    "BPC 157",
    "TB 500",
    "Retrutide",
    "Epitalon",
    "Tesamorelin",
    "ipamorelin",
    "Ghkcu and topicals",
    "SS331",
    "DSIP",
    "NAD",
    "NMN",
    "MIC+b12",
  ]

  // Image URL - using the frontend public folder
  const imageUrl = "http://localhost:8000/images/vial.png"

  // Create products array
  const products = peptides.map((peptideName) => {
    const handle = peptideName.toLowerCase().replace(/\s+/g, "-").replace(/\+/g, "plus")
    const category = peptideName.toLowerCase().includes("topical") 
      ? categoryResult.find((cat) => cat.name === "Topicals")!.id
      : categoryResult.find((cat) => cat.name === "Peptides")!.id
    
    return {
      title: peptideName,
      category_ids: [category],
      description: `Laboratory-grade ${peptideName} for research purposes only.`,
      handle: handle,
      weight: 50, // Typical vial weight
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      images: [
        {
          url: imageUrl,
        },
      ],
      options: [
        {
          title: "Size",
          values: ["5mg", "10mg"],
        },
      ],
      variants: [
        {
          title: "5mg",
          sku: `PEP-${handle.toUpperCase().replace(/-/g, "")}-5MG`,
          options: {
            Size: "5mg",
          },
          prices: [
            {
              amount: 5000, // $50.00 in cents
              currency_code: "usd",
            },
            {
              amount: 4500, // €45.00 in cents
              currency_code: "eur",
            },
          ],
        },
        {
          title: "10mg",
          sku: `PEP-${handle.toUpperCase().replace(/-/g, "")}-10MG`,
          options: {
            Size: "10mg",
          },
          prices: [
            {
              amount: 8000, // $80.00 in cents
              currency_code: "usd",
            },
            {
              amount: 7200, // €72.00 in cents
              currency_code: "eur",
            },
          ],
        },
      ],
      sales_channels: [
        {
          id: defaultSalesChannel.id,
        },
      ],
    }
  })

  await createProductsWorkflow(container).run({
    input: {
      products: products,
    },
  })

  logger.info("Successfully created peptide products!")
}

