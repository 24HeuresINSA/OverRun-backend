import { Edition, Payment, Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { prisma } from "../server";
import {
  getHelloassoCheckoutIntent,
  helloassoDateFormater,
  initiateHelloassoCheckoutIntent,
} from "../utils/helloassoProvider";
import { jsonPaginateResponse } from "../utils/jsonResponseFormater";
import { InscriptionStatus } from "./inscriptions";

const ONE_MINUTE_IN_MILLISECONDS = 60 * 1000;

export enum PaymentStatus {
  NOT_STARTED = "NOT_STARTED",
  PENDING = "PENDING",
  VALIDATED = "VALIDATED",
  REFUSED = "REFUSED",
  REFUND = "REFUND",
  REFUNDING = "REFUNDING",
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
          dateOfBirth: true,
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
      status: true,
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

export const getTotalPayments = async (req: Request, res: Response) => {
  const editionId = parseInt(req.query.editionId as string);
  try {
    const totals = await prisma.payment.groupBy({
      by: ["status"],
      where: {
        inscription: {
          editionId: editionId,
          NOT: {
            status: InscriptionStatus.CANCELLED,
          },
        },
        status: PaymentStatus.VALIDATED,
      },
      _sum: {
        donationAmount: true,
        raceAmount: true,
      },
    });

    res.json(totals);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getAmountByDate = async (req: Request, res: Response) => {
  try {
    const editionId = parseInt(req.query.edition as string);
    const sumResponse = await prisma.payment.findMany({
      where: {
        inscription: {
          editionId: editionId,
          NOT: {
            status: InscriptionStatus.CANCELLED,
          },
        },
        status: PaymentStatus.VALIDATED,
      },
      select: {
        date: true,
        raceAmount: true,
        donationAmount: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    const sumPerDate = sumResponse.reduce(
      (acc, current) => {
        const date = current.date.toLocaleDateString("en-US");
        if (!acc.race[date]) acc.race[date] = 0;
        if (!acc.donation[date]) acc.donation[date] = 0;
        acc.race[date] += current.raceAmount;
        if (current.donationAmount)
          acc.donation[date] += current.donationAmount;
        return acc;
      },
      { race: {}, donation: {} } as {
        race: { [key1: string]: number };
        donation: { [key2: string]: number };
      }
    );

    const labels = Object.keys(sumPerDate.race);
    const simpleRace = Object.values(sumPerDate.race);
    const simpleDonation = Object.values(sumPerDate.donation);

    for (let index = 0; index < labels.length - 1; index++) {
      const date1 = new Date(labels[index]);
      const date2 = new Date(labels[index + 1]);
      const tomorrow = new Date(date1.setHours(date1.getHours() + 24));
      if (date2.getTime() !== tomorrow.getTime()) {
        labels.splice(index + 1, 0, tomorrow.toLocaleDateString("en-US"));
        simpleRace.splice(index + 1, 0, 0);
        simpleDonation.splice(index + 1, 0, 0);
      }
    }

    const cumulativeRace = simpleRace.reduce((acc, current) => {
      if (acc.length > 0) {
        acc.push(current + acc[acc.length - 1]);
      } else {
        acc.push(current);
      }
      return acc;
    }, [] as number[]);
    const cumulativeDonation = simpleDonation.reduce((acc, current) => {
      if (acc.length > 0) {
        acc.push(current + acc[acc.length - 1]);
      } else {
        acc.push(current);
      }
      return acc;
    }, [] as number[]);

    res.json({
      labels,
      data: {
        simpleRace,
        cumulativeRace,
        simpleDonation,
        cumulativeDonation,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const getPayments = async (req: Request, res: Response) => {
  const validation = validationResult(req);
  if (!validation.isEmpty()) {
    return res.status(400).json({ err: validation.array() });
  }

  const searchString = req.query.search as string;

  const paymentStatusCondition = req.query.status as PaymentStatus;
  const wherePaymentStatus = paymentStatusCondition
    ? { status: { equals: paymentStatusCondition } }
    : {};

  const inscriptionStatusCondition = req.query
    .inscriptionStatus as InscriptionStatus;
  const whereInscriptionStatus = inscriptionStatusCondition
    ? { inscription: { status: { equals: inscriptionStatusCondition } } }
    : {};

  const raceIdCondition = parseInt(req.query.raceId as string);
  const whereRaceId = raceIdCondition
    ? { inscription: { raceId: { equals: raceIdCondition } } }
    : {};

  try {
    const payments = await prisma.payment.findMany({
      select: selectedFields,
      orderBy: req.orderBy,
      where: {
        ...searchingFields(searchString),
        ...req.filter,
        ...wherePaymentStatus,
        ...whereInscriptionStatus,
        ...whereRaceId,
      },
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
      err: "Internal error.....",
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

  const inscription = await prisma.inscription.findUnique({
    where: {
      id: payment.inscription.id,
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
    return res.status(500).json({ err: "Inscription associated not found" });

  if (payment.status !== PaymentStatus.NOT_STARTED)
    return res.status(409).json({ err: "Payment already initiated" });

  const raceAmount = inscription?.va
    ? inscription.race.vaRegistrationPrice
    : inscription.race.registrationPrice;

  const computedTotalAmount = raceAmount + parseInt(donationAmount);

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
      raceAmount,
      donationAmount,
      donationAmount > 0 ? true : false,
      {
        firstName: payment.inscription.athlete.firstName,
        lastName: payment.inscription.athlete.lastName,
        email: payment.inscription.athlete.user.email,
        // dateOfBirth: helloassoDateFormater(
        //   payment.inscription.athlete.dateOfBirth // To uncomment when HelloAsso will fix their API and permit a payment from a minor
        // ),
        address: payment.inscription.athlete.address,
        city: payment.inscription.athlete.city,
        zipCode: payment.inscription.athlete.zipCode,
        country: "FRA",
      },
      req.headers.authorization?.slice(7) as string
    );

    if (helloassoCheckoutIntent?.errors)
      return res.status(500).json(helloassoCheckoutIntent);

    const updatedPayment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        raceAmount,
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

  const inscription = await prisma.inscription.findUnique({
    where: {
      id: payment.inscription.id,
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
    return res.status(500).json({ err: "Inscription associated not found" });

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

  const raceAmount = inscription?.va
    ? inscription.race.vaRegistrationPrice
    : inscription.race.registrationPrice;

  const computedTotalAmount =
    raceAmount +
    parseInt(
      donationAmount || donationAmount === 0
        ? donationAmount
        : payment.donationAmount
    );

  if (computedTotalAmount === 0) {
    const updatedPayment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        totalAmount: computedTotalAmount,
        donationAmount,
        helloassoCheckoutIntentId: null,
        helloassoCheckoutIntentUrl: null,
        helloassoCheckoutExpiresAt: null,
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
      raceAmount,
      donationAmount,
      donationAmount > 0 ? true : false,
      {
        firstName: payment.inscription.athlete.firstName,
        lastName: payment.inscription.athlete.lastName,
        email: payment.inscription.athlete.user.email,
        // dateOfBirth: helloassoDateFormater(
        //   payment.inscription.athlete.dateOfBirth // To uncomment when HelloAsso will fix their API and permit a payment from a minor
        // ),
        address: payment.inscription.athlete.address,
        city: payment.inscription.athlete.city,
        zipCode: payment.inscription.athlete.zipCode,
        country: "FRA",
      },
      req.headers.authorization?.slice(7) as string
    );

    if (helloassoCheckoutIntent?.errors)
      return res.status(500).json(helloassoCheckoutIntent);

    const updatedPayment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        raceAmount,
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
        date: req.body.data.date,
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
        date: helloassoResponse.order.payments[0].date,
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
        status: PaymentStatus.REFUNDING,
      },
      select: selectedFields,
    });
    return res.json(payment);
  }

  if (
    helloassoResponse.order.payments.some(
      (payment) => payment.state === "Refunded"
    )
  ) {
    const payment = await prisma.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: PaymentStatus.REFUND,
        date: helloassoResponse.order.payments[0].date,
      },
      select: selectedFields,
    });
    return res.json(payment);
  }
};

export const paymentsByDateToJSON = async (req: Request, res: Response) => {
  const editionId = parseInt(req.query.editionId as string);

  try {
    const edition = await prisma.edition.findUnique({
      where: {
        id: editionId,
      },
    });

    if (!edition) {
      res.status(404);
      return res.json({
        err: "Edition not found.",
      });
    }

    const respo = await paymentsByDate(edition);

    res.json(respo);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

export const paymentsByDateToCSV = async (req: Request, res: Response) => {
  const editionId = parseInt(req.query.editionId as string);

  try {
    const edition = await prisma.edition.findUnique({
      where: {
        id: editionId,
      },
    });

    if (!edition) {
      res.status(404);
      return res.json({
        err: "Edition not found.",
      });
    }

    const respo = await paymentsByDate(edition);

    let csv =
      "Date;Montant (en centimes);Don (en centimes);Nom de la course;VA;Statut\n";
    for (const day of Object.keys(respo)) {
      for (const payment of respo[day]) {
        csv += `${day};${payment.raceAmount};${payment.donationAmount};${
          payment.inscription.race.name
        };${payment.inscription.va ? "true" : "false"};${payment.status}\n`;
      }
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=export.csv");
    res.send(csv);
  } catch (err) {
    console.log(err);
    res.status(500);
    res.json({
      err: "Internal error.",
    });
  }
};

const paymentsByDate = async (edition: Edition) => {
  type ReturnData = {
    [key: string]: {
      date: Date;
      raceAmount: number;
      donationAmount: number;
      status: string;
      inscription: {
        va: {
          id: number;
        } | null;
        race: {
          id: number;
          name: string;
          registrationPrice: number;
          vaRegistrationPrice: number;
        };
      };
    }[];
  };
  const payments = await prisma.payment.findMany({
    where: {
      inscription: {
        editionId: edition.id,
      },
      OR: [
        { status: PaymentStatus.VALIDATED },
        { status: PaymentStatus.REFUND },
      ],
    },
    select: {
      date: true,
      raceAmount: true,
      donationAmount: true,
      status: true,
      inscription: {
        select: {
          va: {
            select: {
              id: true,
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
        },
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const countedPayments = payments.reduce((acc, payment) => {
    const date = payment.date.toLocaleDateString("fr-FR", {
      timeZone: "Europe/Paris",
    });
    if (!acc[date]) {
      acc[date] = [payment];
    } else {
      acc[date].push(payment);
    }
    return acc;
  }, {} as ReturnData);

  return countedPayments;
};
