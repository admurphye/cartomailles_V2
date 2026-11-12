/** Separate navigation allows tests to intercept redirects without opening Stripe. */
export function navigateToCheckout(url: string) {
  window.location.assign(url);
}
