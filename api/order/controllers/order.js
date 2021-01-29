"use strict";

const { default: createStrapi } = require("strapi");
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const Stripe = require("stripe");
const stripe = Stripe(
  "sk_test_51IEFmHEBoNytVx4hZopMxZkSV1w1meug4E0hXA9WSrGbzMCesshx3ayU7g2JHmAQZGxq6K5CMve5jQJXbFOnejOk00z6ECtcVd"
);
const { sanitizeEntity } = require("strapi-utils");

module.exports = {
  setUpStripe: async (ctx) => {
    let total = 100;
    let validatedCart = [];
    let receiptCart = [];

    const { cart } = ctx.request.body;

    await Promise.all(
      cart.map(async (product) => {
        const validatedProduct = await strapi.services.product.findOne({
          id: product.id,
        });

        if (validatedProduct) {
          validatedProduct.qty = product.qty;
          validatedCart.push(validatedProduct);
          receiptCart.push({
            id: product.id,
            qty: product.qty,
          });
        }
        return validatedProduct;
      })
    );

    total = strapi.config.functions.cart.cartTotal(validatedCart);

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: total,
        currency: "usd",
        // Verify your integration in this guide by including this parameter
        metadata: { cart: JSON.stringify(receiptCart) },
      });

      return paymentIntent;
    } catch (err) {
      return { error: err.raw.message };
    }
  },

  create: async (ctx) => {
    const {
      paymentIntent,
      shipping_name,
      shipping_address,
      shipping_country,
      shipping_state,
      shipping_zip,
      cart,
    } = ctx.request.body;


    let paymentInfo;
    // Payment intent for validation
    try {
       paymentInfo = await stripe.paymentIntents.retrieve(
        paymentIntent.id
      );
      if (paymentInfo.status !== 'succeeded'){
        throw {message: "You still have to pay"}
      }
    } catch (err) {
      ctx.response.status = 402;
      return { error: err.message };
    }

    // Check if payment intent wasn't already used to generate an order
    const alreadyExistingOrder = await strapi.services.order.find({
      payment_intent_id: paymentIntent.id
    })

    if (alreadyExistingOrder && alreadyExistingOrder.length >0){
      ctx.response.status = 402;
      return { error: "This payment intent was already used" };
    }

const payment_intent_id = paymentIntent.id;

    let product_qty = [];
    let products = [];
    let sanitizedCart = [];

    await Promise.all(
      cart.map(async (product) => {
        const foundProduct = await strapi.services.product.findOne({
          id: product.strapiId,
        });

        if (foundProduct) {
          product_qty.push({
            id: product.strapiId,
            qty: product.qty,
          });
          products.push(foundProduct);
          sanitizedCart.push({
            ...foundProduct,
            ...{ qty: product.qty },
          });
        }

        return foundProduct;
      })
    );

    let total_in_cents = strapi.config.functions.cart.cartTotal(sanitizedCart);
    console.log("total_in_cents", total_in_cents);
    let subtotal_in_cents = strapi.config.functions.cart.cartSubtotal(
      sanitizedCart
    );
    let taxes_in_cents = strapi.config.functions.cart.cartTaxes(sanitizedCart);


    if (paymentInfo.amount === total_in_cents) {
      ctx.response.status = 402;
      return { error: "The total to be paid is different from the total from the payment intent" };
    }

    const entry = {
      shipping_name,
      shipping_address,
      shipping_country,
      shipping_state,
      shipping_zip,
      product_qty,
      products,
      total_in_cents,
      subtotal_in_cents,
      taxes_in_cents,
      payment_intent_id
    };

    const entity = await strapi.services.order.create(entry);
    return sanitizeEntity(entity, { model: strapi.models.order });
  },
};
