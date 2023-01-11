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
  dateOfBirth: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface HelloassoCheckoutIntent {
  id: number;
  redirectUrl: string;
}

export const helloAssoProvider = axios.create({
  baseURL: process.env.HELLOASSO_BASE_URL,
});

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
  isDonation: boolean,
  payer: HelloassoPayer
): Promise<HelloassoCheckoutIntent> => {
  const token = await getHelloassoToken();
  const response = await helloAssoProvider.post(
    `/v5/organizations/${process.env.HELLOASSO_ORGANISATION_SLUG}/checkout-intents`,
    {
      totalAmount: totalAmount,
      initialAmount: totalAmount,
      itemName:
        "Paiement pour la participation aux couses des 24 heures de l'INSA (OverRun)",
      backUrl: `${process.env.FRONTEND_URL}/`,
      errorUrl: `${process.env.FRONTEND_URL}/`,
      returnUrl: `${process.env.FRONTEND_URL}/`,
      containsDonation: isDonation,
      payer,
      metadata: {
        inscriptionId,
        paymentId,
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
