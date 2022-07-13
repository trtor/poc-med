import express, { Application, Request, Response } from "express";

const app: Application = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export default app;
