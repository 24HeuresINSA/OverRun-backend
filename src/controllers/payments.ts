import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { Request, Response } from "express";
import { prisma } from "../server";
import {
  getHelloassoCheckoutIntent,
  helloassoDateFormater,
  initiateHelloassoCheckoutIntent,
} from "../utils/helloassoProvider";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";

const ONE_MINUTE_IN_MILLISECONDS = 60 * 1000;

export enum PaymentStatus {
  NOT_STARTED = "NOT_STARTED",
  PENDING = "PENDING",
  VALIDATED = "VALIDATED",
  REFUSED = "REFUSED",
  REFUND = "REFUND",
}

const selectedFields = {
  id: true,
  status: true,
  raceAmount: true,
  totalAmount: true,
  donationAmount: true,
  helloassoCheckoutIntentId: true,
  helloassoCheckoutIntentUrl: true,
  helloassoCheckoutExpiresAt: true,
  helloassoPaymentReceiptUrl: true,
  inscription: {
    select: {
      id: true,
      athlete: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      race: {
        select: {
          id: true,
          name: true,
          registrationPrice: true,
          vaRegistrationPrice: true,
        },
      },
      edition: {
        select: {
          id: true,
        },
      },
    },
  },
};

function searchingFields(searchString: string): Prisma.PaymentWhereInput {
  if (!searchString || searchString === "") return {};
  return {
    OR: [
      {
        inscription: {
          athlete: {
            firstName: {
              contains: searchString,
              mode: "insensitive",
            },
          },
        },
      },
      {
        inscription: {
          athlete: {
            lastName: {
              contains: searchString,
              mode: "insensitive",
            },
          },
        },
      },
      {
        inscription: {
          race: {
            name: {
              contains: searchString,
              mode: "insensitive",
            },
          },
        },
      },
    ],
  };
}

export const getPayments = async (req: Request, res: Response) => {
  const searchString = req.query.search as string;
  console.log({ ...searchingFields(searchString), ...req.filter });
  try {
    const payments = await prisma.payment.findMany({
      select: selectedFields,
      orderBy: req.orderBy,
      where: { ...searchingFields(searchString), ...req.filter },
    });
    res.json(jsonPaginateResponse(payments, req));
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  const paymentId = parseInt(req.params.id);
  try {
    const payment = await prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
      select: selectedFields,
    });
    res.json(payment);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getMypayments = async (req: Request, res: Response) => {
  const athleteId = req.user.athleteId;
  try {
    const payments = await prisma.payment.findMany({
      where: {
        inscription: {
          athleteId,
        },
      },
      select: selectedFields,
    });
    res.json(payments);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const createPayment = async (req: Request, res: Response) => {
  const { inscriptionId } = req.body;

  if (typeof inscriptionId !== "number")
    return res.status(400).json({ err: "Inscription id is required" });

  const inscription = await prisma.inscription.findUnique({
    where: {
      id: inscriptionId,
    },
    select: {
      id: true,
      race: {
        select: {
          registrationPrice: true,
          vaRegistrationPrice: true,
        },
      },
      va: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!inscription)
    return res.status(404).json({ err: "Inscription not found" });
  const racePrice = inscription?.va
    ? inscription.race.vaRegistrationPrice
    : inscription.race.registrationPrice;

  try {
    const payment = await prisma.payment.create({
      data: {
        inscriptionId: inscription.id,
        status: PaymentStatus.NOT_STARTED,
        raceAmount: racePrice,
        totalAmount: racePrice,
      },
      select: selectedFields,
    });
    res.json(payment);
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        res.status(409);
        res.json({
          err: "The payment already exists.",
        });
        return;
      }
    }
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const initiatePayment = async (req: Request, res: Response) => {
  const paymentId = parseInt(req.params.id);
  const { donationAmount } = req.body;

  if (!paymentId)
    return res.status(400).json({ err: "Payment id is required" });

  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      raceAmount: true,
      donationAmount: true,
      inscription: {
        select: {
          id: true,
          athlete: {
            select: {
              user: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              address: true,
              city: true,
              zipCode: true,
              country: true,
            },
          },
        },
      },
    },
  });

  if (!payment) return res.status(404).json({ err: "Payment not found" });

  if (payment.status !== PaymentStatus.NOT_STARTED)
    return res.status(409).json({ err: "Payment already initiated" });

  const computedTotalAmount = payment.totalAmount + parseInt(donationAmount);

  if (computedTotalAmount === 0) {
    const updatedPayment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        totalAmount: computedTotalAmount,
        donationAmount,
        status: PaymentStatus.VALIDATED,
      },
      select: selectedFields,
    });

    res.json(updatedPayment);
    return;
  }

  try {
    const helloassoCheckoutIntent = await initiateHelloassoCheckoutIntent(
      payment.id,
      payment.inscription.id,
      computedTotalAmount,
      payment.raceAmount,
      donationAmount,
      donationAmount > 0 ? true : false,
      {
        firstName: payment.inscription.athlete.firstName,
        lastName: payment.inscription.athlete.lastName,
        email: payment.inscription.athlete.user.email,
        dateOfBirth: helloassoDateFormater(
          payment.inscription.athlete.dateOfBirth
        ),
        address: payment.inscription.athlete.address,
        city: payment.inscription.athlete.city,
        zipCode: payment.inscription.athlete.zipCode,
        country: "FRA",
      },
      req.headers.authorization?.slice(7) as string
    );

    const updatedPayment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        totalAmount: computedTotalAmount,
        donationAmount,
        status: PaymentStatus.PENDING,
        helloassoCheckoutIntentId: helloassoCheckoutIntent.id,
        helloassoCheckoutIntentUrl: helloassoCheckoutIntent.redirectUrl,
        helloassoCheckoutExpiresAt: new Date(
          new Date().getTime() + 15 * ONE_MINUTE_IN_MILLISECONDS
        ),
      },
      select: selectedFields,
    });

    res.json(updatedPayment);
  } catch (err) {
    console.log(err);
    res.status(500);
    return res.json({
      err: "An error occured while initiating the payment with helloasso.",
    });
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  const paymentId = parseInt(req.params.id);
  const { donationAmount } = req.body;
  const now = new Date().getTime();

  if (!paymentId)
    return res.status(400).json({ err: "Payment id is required" });

  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    select: {
      id: true,
      status: true,
      helloassoCheckoutExpiresAt: true,
      totalAmount: true,
      raceAmount: true,
      donationAmount: true,
      inscription: {
        select: {
          id: true,
          athlete: {
            select: {
              user: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              address: true,
              city: true,
              zipCode: true,
              country: true,
            },
          },
        },
      },
    },
  });

  if (!payment) return res.status(404).json({ err: "Payment not found" });

  if (
    payment.status === PaymentStatus.NOT_STARTED ||
    !payment.helloassoCheckoutExpiresAt
  )
    return res.status(409).json({ err: "Payment aren't initiated" });

  if (payment.status === PaymentStatus.VALIDATED)
    return res.status(409).json({ err: "Payment already validated" });

  if (
    payment.status === PaymentStatus.PENDING &&
    now < payment.helloassoCheckoutExpiresAt.getTime() &&
    payment.donationAmount === donationAmount
  )
    return res.status(409).json({ err: "Payment already initiated" });

  const computedTotalAmount =
    payment.raceAmount +
    parseInt(
      donationAmount || donationAmount === 0
        ? donationAmount
        : payment.donationAmount
    );

  console.log("donationAmount", donationAmount);
  console.log("computedTotalAmount", computedTotalAmount);

  try {
    const helloassoCheckoutIntent = await initiateHelloassoCheckoutIntent(
      payment.id,
      payment.inscription.id,
      computedTotalAmount,
      payment.raceAmount,
      donationAmount,
      donationAmount > 0 ? true : false,
      {
        firstName: payment.inscription.athlete.firstName,
        lastName: payment.inscription.athlete.lastName,
        email: payment.inscription.athlete.user.email,
        dateOfBirth: helloassoDateFormater(
          payment.inscription.athlete.dateOfBirth
        ),
        address: payment.inscription.athlete.address,
        city: payment.inscription.athlete.city,
        zipCode: payment.inscription.athlete.zipCode,
        country: "FRA",
      },
      req.headers.authorization?.slice(7) as string
    );

    const updatedPayment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        totalAmount: computedTotalAmount,
        donationAmount,
        status: PaymentStatus.PENDING,
        helloassoCheckoutIntentId: helloassoCheckoutIntent.id,
        helloassoCheckoutIntentUrl: helloassoCheckoutIntent.redirectUrl,
        helloassoCheckoutExpiresAt: new Date(
          new Date().getTime() + 15 * ONE_MINUTE_IN_MILLISECONDS
        ),
      },
      select: selectedFields,
    });

    res.json(updatedPayment);
  } catch (err: any) {
    console.log(err);
    res.status(500);
    return res.json({
      err: "An error occured while initiating the payment with helloasso.",
    });
  }
};

export const validatePayment = async (req: Request, res: Response) => {
  const paymentId = parseInt(req.params.id);

  try {
    const payment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: PaymentStatus.VALIDATED,
        helloassoPaymentReceiptUrl: req.body.data.paymentReceiptUrl,
      },
      select: selectedFields,
    });
    res.json(payment);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const refusePayment = async (req: Request, res: Response) => {
  const paymentId = parseInt(req.params.id);

  try {
    const payment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: PaymentStatus.REFUSED,
      },
      select: selectedFields,
    });
    res.json(payment);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const refundPayment = async (req: Request, res: Response) => {
  const paymentId = parseInt(req.params.id);

  try {
    const payment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: PaymentStatus.REFUND,
      },
      select: selectedFields,
    });
    res.json(payment);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const setStatusByHelloasso = async (req: Request, res: Response) => {
  const paymentId = parseInt(req.params.id);

  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    select: selectedFields,
  });

  if (!payment?.helloassoCheckoutIntentId)
    return res
      .status(404)
      .json({ err: "Payment or helloasso intent not found" });

  const helloassoResponse = await getHelloassoCheckoutIntent(
    payment.helloassoCheckoutIntentId
  );

  if (!helloassoResponse?.order?.payments) {
    const payment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: PaymentStatus.REFUSED,
      },
      select: selectedFields,
    });
    return res.json(payment);
  }

  if (
    helloassoResponse.order.payments.some(
      (payment) => payment.state === "Authorized"
    )
  ) {
    const payment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: PaymentStatus.VALIDATED,
      },
      select: selectedFields,
    });
    return res.json(payment);
  }

  if (
    helloassoResponse.order.payments.some(
      (payment) => payment.state === "Refunding"
    )
  ) {
    const payment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: PaymentStatus.REFUND,
      },
      select: selectedFields,
    });
    return res.json(payment);
  }
};
