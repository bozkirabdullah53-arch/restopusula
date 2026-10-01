import React from "react";
import { createRoot } from "react-dom/client";
import Workspace from "./Workspace";
import "./styles.css";
import "./restaurant.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Workspace />
  </React.StrictMode>,
);
