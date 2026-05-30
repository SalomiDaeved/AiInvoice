import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
} from "react";

import { dashboardStyles } from "../assets/Styles.js";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

import KpiCard from "../components/KpiCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx"; // ✅ FIX 1: Fixed typo (was "StatuseBadge") + ✅ FIX 2: Removed unused "CreateInvoice" import


const API_BASE = "http://localhost:4000";

// =========================
// CLIENT NORMALIZER
// =========================
function normalizeClient(raw) {
  if (!raw) {
    return {
      name: "",
      email: "",
      address: "",
      phone: "",
    };
  }

  if (typeof raw === "string") {
    return {
      name: raw,
      email: "",
      address: "",
      phone: "",
    };
  }

  if (typeof raw === "object") {
    return {
      name: raw.name ?? raw.company ?? raw.client ?? "",
      email: raw.email ?? raw.emailAddress ?? "",
      address: raw.address ?? "",
      phone: raw.phone ?? raw.contact ?? "",
    };
  }

  return {
    name: "",
    email: "",
    address: "",
    phone: "",
  };
}

// =========================
// CURRENCY NORMALIZER
// =========================
function normalizeCurrency(currency) {
  const c = String(currency || "LKR")
    .trim()
    .toUpperCase();

  if (c === "RS" || c === "RUPEES") {
    return "LKR";
  }

  return c || "LKR";
}

// =========================
// CURRENCY FORMATTER
// =========================
function currencyFmt(amount = 0, currency = "LKR") {
  try {
    const n = Number(amount || 0);

    const fixedCurrency = normalizeCurrency(currency);

    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: fixedCurrency,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `LKR ${Number(amount || 0).toFixed(2)}`;
  }
}

// =========================
// USD -> LKR CONVERSION
// =========================
const HARD_RATES = {
  USD_TO_LKR: 300,
};

function convertToLKR(amount = 0, currency = "LKR") {
  const n = Number(amount || 0);

  const curr = String(currency || "LKR")
    .trim()
    .toUpperCase();

  if (curr === "LKR") {
    return n;
  }

  if (curr === "USD") {
    return n * HARD_RATES.USD_TO_LKR;
  }

  return n;
}

// =========================
// ICONS
// =========================
const FileTextIcon = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const EyeIcon = ({
  className = "w-4 h-4",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// =========================
// HELPERS
// =========================
function capitalize(s) {
  if (!s) return s;

  return (
    String(s).charAt(0).toUpperCase() +
    String(s).slice(1)
  );
}

function formatDate(dateInput) {
  if (!dateInput) return "—";

  const d =
    dateInput instanceof Date
      ? dateInput
      : new Date(String(dateInput));

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  const dd = String(d.getDate()).padStart(
    2,
    "0"
  );

  const mm = String(
    d.getMonth() + 1
  ).padStart(2, "0");

  const yyyy = d.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

// =========================
// DASHBOARD COMPONENT
// =========================
const Dashboard = () => {
  const navigate = useNavigate();

  const { getToken, isSignedIn } = useAuth();

  const [storedInvoices, setStoredInvoices] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [businessProfile, setBusinessProfile] =
    useState(null);

  // =========================
  // TOKEN
  // =========================
  const obtainToken = useCallback(
    async () => {
      if (typeof getToken !== "function") {
        return null;
      }

      try {
        let token = await getToken({
          template: "default",
        }).catch(() => null);

        if (!token) {
          token = await getToken({
            forceRefresh: true,
          }).catch(() => null);
        }

        return token;
      } catch {
        return null;
      }
    },
    [getToken]
  );

  // =========================
  // FETCH INVOICES
  // =========================
  const fetchInvoices = useCallback(
    async () => {
      setLoading(true);

      setError(null);

      try {
        const token = await obtainToken();

        const headers = {
          Accept: "application/json",
        };

        if (token) {
          headers[
            "Authorization"
          ] = `Bearer ${token}`;
        }

        const res = await fetch(
          `${API_BASE}/api/invoice`,
          {
            method: "GET",
            headers,
          }
        );

        const json = await res
          .json()
          .catch(() => null);

        if (res.status === 401) {
          setError(
            "Unauthorized. Please sign in."
          );

          setStoredInvoices([]);

          return;
        }

        if (!res.ok) {
          const msg =
            json?.message ||
            `Failed to fetch (${res.status})`;

          throw new Error(msg);
        }

        const raw = json?.data || [];

        const mapped = (
          Array.isArray(raw) ? raw : []
        ).map((inv) => {
          const clientObj =
            normalizeClient(inv.client);

          const amountVal = Number(
            inv.total ?? inv.amount ?? 0
          );

          const currency =
            normalizeCurrency(
              inv.currency || "LKR"
            );

          return {
            ...inv,

            id:
              inv.invoiceNumber ||
              inv._id ||
              String(inv._id || ""),

            client: clientObj,

            amount: amountVal,

            currency,

            status:
              typeof inv.status === "string"
                ? capitalize(inv.status)
                : inv.status || "Draft",
          };
        });

        setStoredInvoices(mapped);
      } catch (err) {
        console.error(
          "Failed to fetch invoices:",
          err
        );

        setError(
          err?.message ||
            "Failed to load invoices"
        );

        setStoredInvoices([]);
      } finally {
        setLoading(false);
      }
    },
    [obtainToken]
  );

  // =========================
  // FETCH BUSINESS PROFILE
  // =========================
  const fetchBusinessProfile =
    useCallback(async () => {
      try {
        const token = await obtainToken();

        if (!token) return;

        const res = await fetch(
          `${API_BASE}/api/businessProfile/me`,
          {
            method: "GET",

            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (res.status === 401) {
          return;
        }

        if (!res.ok) return;

        const json = await res
          .json()
          .catch(() => null);

        const data = json?.data || null;

        if (data) {
          setBusinessProfile(data);
        }
      } catch (err) {
        console.warn(
          "Failed to fetch business profile:",
          err
        );
      }
    }, [obtainToken]);

  // =========================
  // EFFECT
  // =========================
  useEffect(() => {
    fetchInvoices();

    fetchBusinessProfile();

    function onStorage(e) {
      if (e.key === "invoice_v1") {
        fetchInvoices();
      }
    }

    window.addEventListener(
      "storage",
      onStorage
    );

    return () =>
      window.removeEventListener(
        "storage",
        onStorage
      );
  }, [
    fetchInvoices,
    fetchBusinessProfile,
    isSignedIn,
  ]);

  // =========================
  // KPIs
  // =========================
  const kpis = useMemo(() => {
    const totalInvoices =
      storedInvoices.length;

    let totalPaid = 0;

    let totalUnpaid = 0;

    let paidCount = 0;

    let unpaidCount = 0;

    storedInvoices.forEach((inv) => {
      const rawAmount =
        typeof inv.amount === "number"
          ? inv.amount
          : Number(
              inv.total ??
                inv.amount ??
                0
            );

      const invCurrency =
        inv.currency || "LKR";

      const amtInLKR = convertToLKR(
        rawAmount,
        invCurrency
      );

      if (inv.status === "Paid") {
        totalPaid += amtInLKR;

        paidCount++;
      }

      if (
        inv.status === "Unpaid" ||
        inv.status === "Overdue"
      ) {
        totalUnpaid += amtInLKR;

        unpaidCount++;
      }
    });

    const totalAmount =
      totalPaid + totalUnpaid;

    const paidPercentage =
      totalAmount > 0
        ? (totalPaid / totalAmount) * 100
        : 0;

    const unpaidPercentage =
      totalAmount > 0
        ? (totalUnpaid / totalAmount) *
          100
        : 0;

    return {
      totalInvoices,
      totalPaid,
      totalUnpaid,
      paidCount,
      unpaidCount,
      paidPercentage,
      unpaidPercentage,
    };
  }, [storedInvoices]);

  // =========================
  // RECENT INVOICES
  // =========================
  const recent = useMemo(() => {
    return storedInvoices
      .slice()
      .sort(
        (a, b) =>
          (Date.parse(
            b.issueDate || 0
          ) || 0) -
          (Date.parse(
            a.issueDate || 0
          ) || 0)
      )
      .slice(0, 5);
  }, [storedInvoices]);

  // =========================
  // CLIENT HELPERS
  // =========================
  const getClientName = (inv) => {
    if (!inv) return "";

    if (typeof inv.client === "string") {
      return inv.client;
    }

    if (typeof inv.client === "object") {
      return (
        inv.client?.name ||
        inv.client?.company ||
        inv.company ||
        ""
      );
    }

    return inv.company || "Client";
  };

  const getClientInitial = (inv) => {
    const clientName = getClientName(inv);

    return clientName
      ? clientName.charAt(0).toUpperCase()
      : "C";
  };

  // =========================
  // OPEN INVOICE
  // =========================
  function openInvoice(invRow) {
    navigate(
      `/app/invoices/${invRow.id}`,
      {
        state: {
          invoice: invRow,
        },
      }
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <div
      className={
        dashboardStyles.pageContainer
      }
    >
      {/* HEADER */}
      <div
        className={
          dashboardStyles.headerContainer
        }
      >
        <h1
          className={
            dashboardStyles.headerTitle
          }
        >
          Dashboard Overview
        </h1>

        <p
          className={
            dashboardStyles.headerSubtitle
          }
        >
          Track your invoicing performance
          and business insights
        </p>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="p-6">
          Loading invoices...
        </div>
      ) : error ? (
        <div className="p-6">
          <div className="text-red-600 mb-3">
            Error: {error}
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchInvoices}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              Retry
            </button>

            {String(error)
              .toLowerCase()
              .includes(
                "unauthorized"
              ) && (
              <button
                onClick={() =>
                  navigate("/login")
                }
                className="px-3 py-1 bg-gray-700 text-white rounded"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* KPI CARDS */}
      <div
        className={
          dashboardStyles.kpiGrid
        }
      >
        <KpiCard
          title="Total Invoices"
          value={kpis.totalInvoices}
          hint="Active invoices"
          iconType="document"
          trend={8.5}
        />

        <KpiCard
          title="Total Paid"
          value={currencyFmt(
            kpis.totalPaid,
            "LKR"
          )}
          hint="Received amount (LKR)"
          iconType="revenue"
          trend={12.2}
        />

        <KpiCard
          title="Total Unpaid"
          value={currencyFmt(
            kpis.totalUnpaid,
            "LKR"
          )}
          hint="Outstanding balance (LKR)"
          iconType="clock"
          trend={-3.1}
        />
      </div>

      {/* MAIN GRID */}
      <div
        className={
          dashboardStyles.mainGrid
        }
      >
        {/* SIDEBAR */}
        <div
          className={
            dashboardStyles.sidebarColumn
          }
        >
          {/* QUICK STATS */}
          <div
            className={
              dashboardStyles.quickStatsCard
            }
          >
            <h3
              className={
                dashboardStyles.quickStatsTitle
              }
            >
              Quick Stats
            </h3>

            <div className="space-y-3">
              <div
                className={
                  dashboardStyles.quickStatsRow
                }
              >
                <span
                  className={
                    dashboardStyles.quickStatsLabel
                  }
                >
                  Paid Rate
                </span>

                <span
                  className={
                    dashboardStyles.quickStatsValue
                  }
                >
                  {kpis.totalInvoices > 0
                    ? (
                        (kpis.paidCount /
                          kpis.totalInvoices) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </span>
              </div>

              <div
                className={
                  dashboardStyles.quickStatsRow
                }
              >
                <span
                  className={
                    dashboardStyles.quickStatsLabel
                  }
                >
                  Avg. Invoice
                </span>

                <span
                  className={
                    dashboardStyles.quickStatsValue
                  }
                >
                  {currencyFmt(
                    kpis.totalInvoices > 0
                      ? (kpis.totalPaid +
                          kpis.totalUnpaid) /
                          kpis.totalInvoices
                      : 0,
                    "LKR"
                  )}
                </span>
              </div>

              <div
                className={
                  dashboardStyles.quickStatsRow
                }
              >
                <span
                  className={
                    dashboardStyles.quickStatsLabel
                  }
                >
                  Collection Eff.
                </span>

                <span
                  className={
                    dashboardStyles.quickStatsValue
                  }
                >
                  {kpis.paidPercentage.toFixed(
                    1
                  )}
                  %
                </span>
              </div>
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div
            className={
              dashboardStyles.cardContainer
            }
          >
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>

              <div
                className={
                  dashboardStyles.quickActionsContainer
                }
              >
                <button
                  onClick={() =>
                    navigate(
                      "/app/create-invoice"
                    )
                  }
                  className={`${dashboardStyles.quickActionButton} ${dashboardStyles.quickActionBlue}`}
                >
                  Create Invoice
                </button>

                <button
                  onClick={() =>
                    navigate(
                      "/app/invoices"
                    )
                  }
                  className={`${dashboardStyles.quickActionButton} ${dashboardStyles.quickActionGray}`}
                >
                  View All Invoices
                </button>

                <button
                  onClick={() =>
                    navigate(
                      "/app/business"
                    )
                  }
                  className={`${dashboardStyles.quickActionButton} ${dashboardStyles.quickActionGray}`}
                >
                  Business Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div
          className={
            dashboardStyles.contentColumn
          }
        >
          <div
            className={
              dashboardStyles.cardContainerOverflow
            }
          >
            {/* TABLE HEADER */}
            <div
              className={
                dashboardStyles.tableHeader
              }
            >
              <div
                className={
                  dashboardStyles.tableHeaderContent
                }
              >
                <div>
                  <h3
                    className={
                      dashboardStyles.tableTitle
                    }
                  >
                    Recent Invoices
                  </h3>

                  <p
                    className={
                      dashboardStyles.tableSubtitle
                    }
                  >
                    Latest 5 invoices from
                    your account
                  </p>
                </div>

                <button
                  onClick={() =>
                    navigate(
                      "/app/invoices"
                    )
                  }
                  className={
                    dashboardStyles.tableActionButton
                  }
                >
                  View All
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div
              className={
                dashboardStyles.tableContainer
              }
            >
              <table
                className={
                  dashboardStyles.table
                }
              >
                <thead>
                  <tr
                    className={
                      dashboardStyles.tableHead
                    }
                  >
                    <th
                      className={
                        dashboardStyles.tableHeaderCell
                      }
                    >
                      Client & ID
                    </th>

                    <th
                      className={
                        dashboardStyles.tableHeaderCell
                      }
                    >
                      Amount
                    </th>

                    <th
                      className={
                        dashboardStyles.tableHeaderCell
                      }
                    >
                      Status
                    </th>

                    <th
                      className={
                        dashboardStyles.tableHeaderCell
                      }
                    >
                      Due Date
                    </th>

                    <th
                      className={
                        dashboardStyles.tableHeaderCell
                      }
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody
                  className={
                    dashboardStyles.tableBody
                  }
                >
                  {recent.map((inv) => {
                    const clientName =
                      getClientName(inv);

                    const clientInitial =
                      getClientInitial(inv);

                    return (
                      <tr
                        key={inv.id}
                        className={
                          dashboardStyles.tableRow
                        }
                        onClick={() =>
                          openInvoice(inv)
                        }
                      >
                        <td
                          className={
                            dashboardStyles.tableCell
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={
                                dashboardStyles.clientAvatar
                              }
                            >
                              {clientInitial}
                            </div>

                            <div>
                              <div
                                className={
                                  dashboardStyles.clientInfo
                                }
                              >
                                {clientName}
                              </div>

                              <div
                                className={
                                  dashboardStyles.clientSubInfo
                                }
                              >
                                {inv.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td
                          className={
                            dashboardStyles.tableCell
                          }
                        >
                          <div
                            className={
                              dashboardStyles.amountCell
                            }
                          >
                            {currencyFmt(
                              inv.amount,
                              inv.currency
                            )}
                          </div>
                        </td>

                        <td
                          className={
                            dashboardStyles.tableCell
                          }
                        >
                          <StatusBadge
                            status={inv.status}
                            size="default"
                            showIcon={true}
                          />
                        </td>

                        <td
                          className={
                            dashboardStyles.tableCell
                          }
                        >
                          <div
                            className={
                              dashboardStyles.dateCell
                            }
                          >
                            {inv.dueDate
                              ? formatDate(
                                  inv.dueDate
                                )
                              : "-"}
                          </div>
                        </td>

                        <td
                          className={
                            dashboardStyles.tableCell
                          }
                        >
                          <div className="text-right">
                            <button
                              onClick={(
                                e
                              ) => {
                                e.stopPropagation();

                                openInvoice(
                                  inv
                                );
                              }}
                              className={
                                dashboardStyles.actionButton
                              }
                            >
                              <EyeIcon className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />

                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* EMPTY STATE */}
                  {recent.length === 0 &&
                    !loading && (
                      <tr>
                        <td
                          colSpan="5"
                          className={
                            dashboardStyles.emptyState
                          }
                        >
                          <div
                            className={
                              dashboardStyles.emptyStateText
                            }
                          >
                            <FileTextIcon
                              className={
                                dashboardStyles.emptyStateIcon
                              }
                            />

                            <div
                              className={
                                dashboardStyles.emptyStateMessage
                              }
                            >
                              No invoices yet
                            </div>

                            <button
                              onClick={() =>
                                navigate(
                                  "/app/create-invoice"
                                )
                              }
                              className={
                                dashboardStyles.emptyStateAction
                              }
                            >
                              Create Your
                              First Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
