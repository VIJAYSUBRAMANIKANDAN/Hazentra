import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import IntroLoader from "./components/IntroLoader";
import DehazeLoader from "./components/DehazeLoader";

// Route-level code splitting: each page ships as its own chunk instead of
// being bundled into the initial load. Only the page the visitor actually
// lands on needs to download before it's interactive.
const Home = lazy(() => import("./pages/Home"));
const Upload = lazy(() => import("./pages/Upload"));
const Results = lazy(() => import("./pages/Results"));
const Settings = lazy(() => import("./pages/Settings"));
const About = lazy(() => import("./pages/About"));

function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <DehazeLoader progress={0} stage="Loading" />
    </div>
  );
}

export default function App() {
  const [introDone, setIntroDone] = useState(false);

  return (
    <>
      {!introDone && <IntroLoader onDone={() => setIntroDone(true)} />}
      <BrowserRouter>
        <Layout>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/results" element={<Results />} />
              <Route path="/about" element={<About />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </>
  );
}
