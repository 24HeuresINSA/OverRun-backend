import axios from "axios";

export interface HelloassoToken {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
}

export interface HelloassoPayer {
  firstName: string;
  lastName: string;
  email: string;
  // dateOfBirth: string; // To uncomment when HelloAsso will fix their API and permit a payment from a minor
  address: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface HelloassoPayment {
  id: number;
  items: object[];
  cashOutState: string;
  paymentReceiptUrl: string;
  amount: number;
  date: string;
  paymentMeans: string;
  state: string;
  meta: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface HelloassoOrder {
  payer: HelloassoPayer;
  items: object[];
  payments: HelloassoPayment[];
  amount: {
    total: number;
    vat: number;
    discount: number;
  };
  date: string;
  fromSlug: string;
  formType: string;
  organizationName: string;
  organizationSlug: string;
  checkoutIntentId: number;
  meta: {
    createdAt: string;
    updatedAt: string;
  };
  isAnonymous: boolean;
  isAmountHidden: boolean;
}
export interface HelloassoCheckoutIntent {
  id: number;
  redirectUrl: string;
  metadata: object;
  order: HelloassoOrder;
  errors?: object[];
}

export enum HelloassoEventType {
  Payment = "Payment",
  Order = "Order",
}

export const helloAssoProvider = axios.create({
  baseURL: process.env.HELLOASSO_BASE_URL,
});

helloAssoProvider.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.log(error);
    console.log(error.response.data);
    return error.response;
  }
);

export const helloassoDateFormater = (date: Date): string => {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

export const getHelloassoToken = async (): Promise<HelloassoToken> => {
  const response = await helloAssoProvider.post(
    "/oauth2/token",
    "grant_type=client_credentials",
    {
      auth: {
        username: process.env.HELLOASSO_CLIENT_ID as string,
        password: process.env.HELLOASSO_CLIENT_SECRET as string,
      },
    }
  );
  return response.data;
};

export const initiateHelloassoCheckoutIntent = async (
  paymentId: number,
  inscriptionId: number,
  totalAmount: number,
  raceAmount: number,
  donationAmount: number,
  isDonation: boolean,
  payer: HelloassoPayer,
  userJWT: string
): Promise<HelloassoCheckoutIntent> => {
  const token = await getHelloassoToken();
  const response = await helloAssoProvider.post(
    `/v5/organizations/${process.env.HELLOASSO_ORGANISATION_SLUG}/checkout-intents`,
    {
      totalAmount: totalAmount,
      initialAmount: totalAmount,
      itemName:
        "Paiement pour la participation aux couses des 24 heures de l'INSA (OverRun)",
      backUrl: `${process.env.FRONTEND_URL}/register/payment/?donationAmount=${donationAmount}&raceAmount=${raceAmount}&token=${userJWT}`,
      errorUrl: `${process.env.FRONTEND_URL}/payment/helloassoreturn/?type=error&totalAmount=${totalAmount}&donationAmount=${donationAmount}&paymentId=${paymentId}&token=${userJWT}`,
      returnUrl: `${process.env.FRONTEND_URL}/payment/helloassoreturn/?type=return&totalAmount=${totalAmount}&donationAmount=${donationAmount}&paymentId=${paymentId}&token=${userJWT}`,
      containsDonation: isDonation,
      payer,
      metadata: {
        inscriptionId,
        paymentId,
        donationAmount,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    }
  );
  return response.data;
};

export const getHelloassoCheckoutIntent = async (
  checkoutIntentId: number
): Promise<HelloassoCheckoutIntent> => {
  const token = await getHelloassoToken();
  const response = await helloAssoProvider.get(
    `/v5/organizations/${process.env.HELLOASSO_ORGANISATION_SLUG}/checkout-intents/${checkoutIntentId}`,
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    }
  );
  return response.data;
};
