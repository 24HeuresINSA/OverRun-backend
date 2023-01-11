import { Request, Response } from "express";
import { prisma } from "../server";
import { HelloassoEventType } from "../utils/helloassoProvider";
import * as paymentCtrl from "./payments";

export const handleNotification = async (req: Request, res: Response) => {
  const { data, eventType, metadata } = req.body;
  const { token } = req.query;

  if (token !== process.env.HELLOASSO_TOKEN) return res.status(401).end();
  if (eventType !== HelloassoEventType.Payment) return res.status(200).end();
  if (data.state !== "Authorized") return res.status(200).end();

  req.params.id = metadata?.paymentId;

  const payment = await prisma.payment.findUnique({
    where: {
      id: parseInt(req.params.id),
    },
  });
  if (payment?.status !== paymentCtrl.PaymentStatus.PENDING)
    return res.status(200).end();

  await paymentCtrl.validatePayment(req, res);
};
