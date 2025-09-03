import { BrowserRouter, Link } from "react-router-dom";
import { NavMenu } from "@shopify/app-bridge-react";
import Routes from "./Routes";

import { QueryProvider, PolarisProvider } from "./components";

export default function App() {
  // Any .tsx or .jsx files in /pages will become a route
  // See documentation for <Routes /> for more info
  const pages = import.meta.glob("./pages/**/!(*.test.[jt]sx)*.([jt]sx)", {
    eager: true,
  });

  return (
    <PolarisProvider>
      <BrowserRouter>
        <QueryProvider>
          <NavMenu>
            {/* <Link to="/" rel="" /> */}
            {/* <Link to="/admin/login">Login</Link>
            <Link to="/pagename">Page Name</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/admin/edit-content">Edit Content</Link>
            <Link to="/admin/optimize-image">Optimize Image</Link> */}
          </NavMenu>
          <Routes pages={pages} />
        </QueryProvider>
      </BrowserRouter>
    </PolarisProvider>
  );
}
