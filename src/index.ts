require("dotenv").config();
import express from "express";
import cors from "cors";
import bodyParser from 'body-parser';
import { Response, Request } from "express";
import routes from "./routes"

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(routes);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript Express!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
