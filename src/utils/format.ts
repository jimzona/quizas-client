const priceINTL = new Intl.NumberFormat("fr-FR", {
  currency: "EUR",
  style: "currency",
})

export const formatPrice = (price: number) => priceINTL.format(price)
