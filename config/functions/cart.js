 const TAX_RATE = process.env.TAX_RATE || 0.1
 const FREE_SHIPPING_TRESHOLD = process.env.FREE_SHIPPING_TRESHOLD || 10000
 const SHIPPING_RATE =  process.env.SHIPPING_RATE || 500

const cartSubtotal = (cart) => {
  const subTotal = cart.reduce((counter, product) => {
    return counter + product.price_in_cent * product.qty;
  }, 0);
  return subTotal;
};

const shouldPayShipping = (cart) => {
  const subTotal = cartSubtotal(cart);
  return subTotal < FREE_SHIPPING_TRESHOLD;
};
const cartTaxes = (cart)=>{
  const subTotal = cartSubtotal(cart);
  return  subTotal * TAX_RATE;
}
const cartTotal = (cart) => {
  const subTotal = cartSubtotal(cart);
  const total =
    subTotal +
    cartTaxes(cart) +
    (shouldPayShipping(cart) ? SHIPPING_RATE : 0);
  return Math.round(total);
};

module.exports = {
  cartSubtotal,
  shouldPayShipping,
  cartTotal,
  cartTaxes
};
