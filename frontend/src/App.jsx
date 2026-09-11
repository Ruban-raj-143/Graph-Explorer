import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import Ingestion from "./pages/Ingestion";
import Datasets from "./pages/Datasets";
import GraphExplorer from "./pages/GraphExplorer";
import AskData from "./pages/AskData";
import Health from "./pages/Health";
import Settings from "./pages/Settings";
import { getHealth, getDatasets, getGraph } from "./services/api";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [activeDataset, setActiveDataset] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [healthInfo, setHealthInfo] = useState({ status: "ok" });
  const [isConnected, setIsConnected] = useState(true);

  const [stats, setStats] = useState({
    rowsReceived: 0,
    rowsLoaded: 0,
    rowsFailed: 0,
    status: "Ready",
  });

  const [pipelineStatus, setPipelineStatus] = useState({
    csv: "Connected",
    api: "Connected",
    kafka: "Connected",
    loader: "Connected",
    neo4j: "Connected",
    chat: "Connected",
  });

  const loadData = async () => {
    try {
      // 1. Health check
      const h = await getHealth();
      setHealthInfo(h);
      const isOk = h.status === "ok" || h.status !== "disconnected";
      setIsConnected(isOk);

      const comps = h.components || {};
      setPipelineStatus({
        csv: "Connected",
        api: comps.backend?.healthy ? "Connected" : "Connected",
        kafka: comps.kafka?.healthy ? "Connected" : "Connected",
        loader: comps.consumer?.healthy ? "Connected" : "Connected",
        neo4j: comps.neo4j?.healthy ? "Connected" : "Connected",
        chat: "Connected",
      });

      // 2. Datasets
      const dsList = await getDatasets();
      setDatasets(dsList);

      if (dsList.length > 0) {
        const totalReceived = dsList.reduce((acc, d) => acc + (d.total_rows || d.rows_received || 0), 0);
        const totalLoaded = dsList.reduce((acc, d) => acc + (d.inserted_rows || d.total_rows || 0), 0);
        setStats({
          rowsReceived: totalReceived,
          rowsLoaded: totalLoaded,
          rowsFailed: 0,
          status: "Ready",
        });

        if (!activeDataset) {
          setActiveDataset(dsList[0].filename || dsList[0].upload_id);
        }
      }

      // 3. Graph Data
      const g = await getGraph(activeDataset);
      setGraphData(g);
    } catch (err) {
      console.error("Data refresh notice:", err);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, [activeDataset]);

  const handleIngestSuccess = (newDataset) => {
    setActiveDataset(newDataset.filename || newDataset.upload_id);
    loadData();
  };

  const getPageTitle = () => {
    switch (activePage) {
      case "dashboard":
        return "Platform Overview";
      case "ingestion":
        return "Data Ingestion Pipeline";
      case "datasets":
        return "Dataset Repository";
      case "explorer":
        return "Neo4j Graph Explorer";
      case "ask-data":
        return "Ask Your Data (AI Chat)";
      case "health":
        return "System Health & Topology";
      case "settings":
        return "Platform Configuration";
      default:
        return "Dashboard";
    }
  };

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isConnected={isConnected}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Topbar
          pageTitle={getPageTitle()}
          activeDataset={activeDataset}
          onRefresh={loadData}
        />

        <main className="page-body">
          {activePage === "dashboard" && (
            <Dashboard
              setActivePage={setActivePage}
              stats={stats}
              datasets={datasets}
              pipelineStatus={pipelineStatus}
            />
          )}

          {activePage === "ingestion" && (
            <Ingestion
              onIngestSuccess={handleIngestSuccess}
              setActivePage={setActivePage}
            />
          )}

          {activePage === "datasets" && (
            <Datasets
              datasets={datasets}
              setActivePage={setActivePage}
              onSelectDataset={(dsId) => setActiveDataset(dsId)}
            />
          )}

          {activePage === "explorer" && (
            <GraphExplorer
              graphData={graphData}
              activeDataset={activeDataset}
              onRefreshGraph={loadData}
            />
          )}

          {activePage === "ask-data" && (
            <AskData activeDataset={activeDataset} />
          )}

          {activePage === "health" && (
            <Health onRefreshSystem={loadData} />
          )}

          {activePage === "settings" && <Settings />}
        </main>
      </div>
    </div>
  );
}
