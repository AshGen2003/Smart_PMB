/**
 * Self-contained mock/demo of a system administration console (user
 * records, role creation/assignment, audit log) built entirely with local
 * React state and hard-coded seed data — it does not call apiFetch() or
 * any Server Action, so nothing here is persisted to the backend. Styled
 * with Tailwind utility classes rather than the CSS Modules used elsewhere
 * in this app. Not currently imported/rendered by any page in this
 * project; kept as a reference/prototype for a future real admin console.
 */
"use client";

import { FormEvent, useMemo, useState } from "react";

type Role = {
  id: string;
  name: string;
  level: string;
  permissions: string[];
  color: string;
};

type UserRecord = {
  id: string;
  name: string;
  email: string;
  division: string;
  district: string;
  status: "Active" | "Review" | "Suspended";
  role: string;
  lastSeen: string;
  clearance: string;
};

type AuditLog = {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  result: "Allowed" | "Updated" | "Created" | "Review";
  source: string;
  severity: "Low" | "Medium" | "High";
};

const permissionOptions = [
  "User records",
  "Audit logs",
  "Role management",
  "Procurement access",
  "Payments review",
  "Regional reporting",
];

const initialRoles: Role[] = [
  {
    id: "sys-admin",
    name: "System Administrator",
    level: "Full access",
    permissions: ["User records", "Audit logs", "Role management"],
    color: "bg-[#0f5a2a]",
  },
  {
    id: "regional-manager",
    name: "Regional Manager",
    level: "Regional access",
    permissions: ["User records", "Procurement access", "Regional reporting"],
    color: "bg-[#d9a51c]",
  },
  {
    id: "finance-officer",
    name: "Finance Officer",
    level: "Finance access",
    permissions: ["Payments review", "Audit logs"],
    color: "bg-[#196f3d]",
  },
];

const initialUsers: UserRecord[] = [
  {
    id: "PMB-1021",
    name: "Nimal Perera",
    email: "nimal.perera@pmb.gov.lk",
    division: "Paddy Procurement",
    district: "Anuradhapura",
    status: "Active",
    role: "Regional Manager",
    lastSeen: "Today, 09:42",
    clearance: "District",
  },
  {
    id: "PMB-1088",
    name: "Ayesha Fernando",
    email: "ayesha.fernando@pmb.gov.lk",
    division: "Finance",
    district: "Colombo",
    status: "Active",
    role: "Finance Officer",
    lastSeen: "Today, 08:18",
    clearance: "National",
  },
  {
    id: "PMB-1134",
    name: "Kasun Silva",
    email: "kasun.silva@pmb.gov.lk",
    division: "Warehouse Operations",
    district: "Polonnaruwa",
    status: "Review",
    role: "Warehouse Clerk",
    lastSeen: "Yesterday, 17:05",
    clearance: "Depot",
  },
  {
    id: "PMB-1197",
    name: "Tharushi Jayasinghe",
    email: "tharushi.jayasinghe@pmb.gov.lk",
    division: "Farmer Services",
    district: "Kurunegala",
    status: "Suspended",
    role: "Field Officer",
    lastSeen: "Jun 24, 14:11",
    clearance: "Field",
  },
];

const initialLogs: AuditLog[] = [
  {
    id: "LOG-9032",
    time: "Today, 09:45",
    actor: "System Administrator",
    action: "Viewed user record",
    target: "PMB-1021",
    result: "Allowed",
    source: "Admin portal",
    severity: "Low",
  },
  {
    id: "LOG-9028",
    time: "Today, 08:22",
    actor: "Ayesha Fernando",
    action: "Reviewed payment batch",
    target: "PAY-4471",
    result: "Updated",
    source: "Finance module",
    severity: "Medium",
  },
  {
    id: "LOG-9019",
    time: "Yesterday, 17:10",
    actor: "Kasun Silva",
    action: "Changed warehouse stock record",
    target: "WH-POL-18",
    result: "Review",
    source: "Warehouse terminal",
    severity: "High",
  },
  {
    id: "LOG-8996",
    time: "Jun 24, 14:14",
    actor: "Security Policy",
    action: "Suspended inactive session",
    target: "PMB-1197",
    result: "Updated",
    source: "Identity service",
    severity: "Medium",
  },
];

/** Turns a display name into a URL/id-safe slug, e.g. "Depot Supervisor" -> "depot-supervisor". */
function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Formats the current time for a new audit log entry, e.g. "Jul 16, 14:05". */
function formatLogTime() {
  return new Intl.DateTimeFormat("en-LK", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

/** Maps a user's status to Tailwind border/background/text classes for the status badge. */
function statusClasses(status: UserRecord["status"]) {
  if (status === "Active") {
    return "border-[#b7dbc1] bg-[#e9f7ee] text-[#0f5a2a]";
  }

  if (status === "Review") {
    return "border-[#efd186] bg-[#fff8e1] text-[#795400]";
  }

  return "border-[#f1b8a9] bg-[#fff0ec] text-[#8b2d16]";
}

/** Maps an audit log's severity to Tailwind background/text classes for the severity badge. */
function severityClasses(severity: AuditLog["severity"]) {
  if (severity === "High") {
    return "bg-[#8b2d16] text-white";
  }

  if (severity === "Medium") {
    return "bg-[#d9a51c] text-[#143d22]";
  }

  return "bg-[#dff1e5] text-[#0f5a2a]";
}

/**
 * Renders the full mock console: sidebar nav, stat cards, a searchable
 * user-records table, role-creation/assignment forms, a role registry, and
 * a filterable audit log — all backed by the local state declared below.
 */
export function SystemAdminDashboard() {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [roleName, setRoleName] = useState("");
  const [roleLevel, setRoleLevel] = useState("Department access");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    "User records",
    "Audit logs",
  ]);
  const [assignmentUserId, setAssignmentUserId] = useState(initialUsers[0].id);
  const [assignmentRoleId, setAssignmentRoleId] = useState(initialRoles[0].id);
  const [query, setQuery] = useState("");
  const [logFilter, setLogFilter] = useState("All");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) =>
      [
        user.id,
        user.name,
        user.email,
        user.division,
        user.district,
        user.role,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, users]);

  const filteredLogs = useMemo(() => {
    if (logFilter === "All") {
      return logs;
    }

    return logs.filter((log) => log.severity === logFilter);
  }, [logFilter, logs]);

  const activeUsers = users.filter((user) => user.status === "Active").length;
  const reviewItems = users.filter((user) => user.status !== "Active").length;

  // Prepends a new synthetic audit log entry (id/time generated locally)
  // whenever a mock action (create role, assign role) happens.
  const addAuditLog = (entry: Omit<AuditLog, "id" | "time">) => {
    setLogs((currentLogs) => [
      {
        id: `LOG-${9000 + currentLogs.length + 1}`,
        time: formatLogTime(),
        ...entry,
      },
      ...currentLogs,
    ]);
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((currentPermissions) =>
      currentPermissions.includes(permission)
        ? currentPermissions.filter((item) => item !== permission)
        : [...currentPermissions, permission],
    );
  };

  const handleCreateRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = roleName.trim();
    if (!trimmedName || selectedPermissions.length === 0) {
      return;
    }

    const nextRole: Role = {
      id: slugify(trimmedName),
      name: trimmedName,
      level: roleLevel,
      permissions: selectedPermissions,
      color: roles.length % 2 === 0 ? "bg-[#0f5a2a]" : "bg-[#d9a51c]",
    };

    setRoles((currentRoles) => {
      const roleExists = currentRoles.some(
        (role) => role.name.toLowerCase() === trimmedName.toLowerCase(),
      );

      if (roleExists) {
        return currentRoles;
      }

      return [...currentRoles, nextRole];
    });

    addAuditLog({
      actor: "System Administrator",
      action: "Created access role",
      target: trimmedName,
      result: "Created",
      source: "Role console",
      severity: "Medium",
    });

    setAssignmentRoleId(nextRole.id);
    setRoleName("");
    setRoleLevel("Department access");
    setSelectedPermissions(["User records", "Audit logs"]);
  };

  const handleAssignRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const selectedRole = roles.find((role) => role.id === assignmentRoleId);
    const selectedUser = users.find((user) => user.id === assignmentUserId);

    if (!selectedRole || !selectedUser) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === selectedUser.id ? { ...user, role: selectedRole.name } : user,
      ),
    );

    addAuditLog({
      actor: "System Administrator",
      action: "Assigned user role",
      target: `${selectedUser.id} -> ${selectedRole.name}`,
      result: "Updated",
      source: "Role console",
      severity: "Low",
    });
  };

  return (
    <main className="min-h-screen bg-[#f6faf2] text-[#173820]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="bg-[#0f5a2a] px-5 py-5 text-white lg:min-h-screen">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-lg border border-[#f2cf63]/50 bg-white text-sm font-bold text-[#0f5a2a]">
              PMB
            </div>
            <div>
              <p className="text-sm font-semibold text-[#f2cf63]">
                Paddy Marketing Board
              </p>
              <h1 className="text-xl font-semibold">System Administrator</h1>
            </div>
          </div>

          <nav className="mt-8 space-y-2 text-sm font-medium">
            {["Overview", "User Records", "Audit Logs", "Roles"].map((item) => (
              <a
                key={item}
                href={`#${slugify(item)}`}
                className="flex min-h-11 items-center rounded-md px-3 text-white/86 transition hover:bg-white/10 hover:text-white"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="mt-8 rounded-md border border-[#f2cf63]/35 bg-[#164f2a] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f2cf63]">
              Access scope
            </p>
            <p className="mt-3 text-2xl font-semibold">{roles.length} roles</p>
            <p className="mt-1 text-sm leading-6 text-white/76">
              National user administration, audit visibility, and role control.
            </p>
          </div>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <header
            id="overview"
            className="flex flex-col gap-4 border-b border-[#d8e8d3] pb-5 xl:flex-row xl:items-end xl:justify-between"
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9d7510]">
                Administration console
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-[#103f20] sm:text-4xl">
                User access, logs, and PMB role governance
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="#audit-logs"
                className="inline-flex min-h-11 items-center rounded-md border border-[#c9a23a] bg-white px-4 text-sm font-semibold text-[#704f00] shadow-sm transition hover:bg-[#fff8e0]"
              >
                View logs
              </a>
              <a
                href="#roles"
                className="inline-flex min-h-11 items-center rounded-md bg-[#d9a51c] px-4 text-sm font-semibold text-[#143d22] shadow-sm transition hover:bg-[#e8b832]"
              >
                Manage roles
              </a>
            </div>
          </header>

          <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Active users", activeUsers.toString(), "Ready for PMB systems"],
              ["Roles", roles.length.toString(), "Created and assignable"],
              ["Audit records", logs.length.toString(), "Recent access events"],
              ["Needs review", reviewItems.toString(), "Accounts to inspect"],
            ].map(([label, value, detail]) => (
              <article
                key={label}
                className="rounded-md border border-[#d8e8d3] bg-white p-4 shadow-sm"
              >
                <p className="text-sm font-medium text-[#59725f]">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-[#0f5a2a]">
                  {value}
                </p>
                <p className="mt-2 text-sm text-[#6b765f]">{detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div
              id="user-records"
              className="rounded-md border border-[#d8e8d3] bg-white shadow-sm"
            >
              <div className="flex flex-col gap-3 border-b border-[#e3eddf] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-[#103f20]">
                    User Records
                  </h3>
                  <p className="mt-1 text-sm text-[#657263]">
                    Staff accounts, divisions, clearance, and current roles.
                  </p>
                </div>

                <label className="w-full sm:max-w-xs">
                  <span className="sr-only">Search user records</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search name, division, role"
                    className="min-h-11 w-full rounded-md border border-[#c9d9c5] bg-[#fbfdf8] px-3 text-sm outline-none transition placeholder:text-[#8a9a83] focus:border-[#0f5a2a] focus:ring-2 focus:ring-[#d9a51c]/45"
                  />
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full text-left text-sm">
                  <thead className="bg-[#f2f7ef] text-xs uppercase tracking-[0.12em] text-[#59725f]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Division</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Clearance</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Last seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf3e9]">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-[#173820]">
                            {user.name}
                          </p>
                          <p className="mt-1 text-xs text-[#667468]">
                            {user.id} | {user.email}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#173820]">
                            {user.division}
                          </p>
                          <p className="mt-1 text-xs text-[#667468]">
                            {user.district}
                          </p>
                        </td>
                        <td className="px-4 py-4 font-medium text-[#0f5a2a]">
                          {user.role}
                        </td>
                        <td className="px-4 py-4 text-[#48584d]">
                          {user.clearance}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex min-h-7 items-center rounded-md border px-2.5 text-xs font-semibold ${statusClasses(
                              user.status,
                            )}`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[#48584d]">
                          {user.lastSeen}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div id="roles" className="grid gap-5">
              <form
                onSubmit={handleCreateRole}
                className="rounded-md border border-[#d8e8d3] bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-[#103f20]">
                      Create Role
                    </h3>
                    <p className="mt-1 text-sm text-[#657263]">
                      Define permissions for PMB staff access.
                    </p>
                  </div>
                  <span className="rounded-md bg-[#fff3c2] px-2.5 py-1 text-xs font-semibold text-[#704f00]">
                    RBAC
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  <label>
                    <span className="text-sm font-medium text-[#324935]">
                      Role name
                    </span>
                    <input
                      value={roleName}
                      onChange={(event) => setRoleName(event.target.value)}
                      placeholder="Example: Depot Supervisor"
                      className="mt-1 min-h-11 w-full rounded-md border border-[#c9d9c5] bg-[#fbfdf8] px-3 text-sm outline-none transition placeholder:text-[#8a9a83] focus:border-[#0f5a2a] focus:ring-2 focus:ring-[#d9a51c]/45"
                    />
                  </label>

                  <label>
                    <span className="text-sm font-medium text-[#324935]">
                      Access level
                    </span>
                    <select
                      value={roleLevel}
                      onChange={(event) => setRoleLevel(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-md border border-[#c9d9c5] bg-[#fbfdf8] px-3 text-sm outline-none transition focus:border-[#0f5a2a] focus:ring-2 focus:ring-[#d9a51c]/45"
                    >
                      <option>National access</option>
                      <option>Regional access</option>
                      <option>Department access</option>
                      <option>Depot access</option>
                    </select>
                  </label>

                  <fieldset>
                    <legend className="text-sm font-medium text-[#324935]">
                      Permissions
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {permissionOptions.map((permission) => (
                        <label
                          key={permission}
                          className="flex min-h-11 items-center gap-2 rounded-md border border-[#dbe8d5] bg-[#fbfdf8] px-3 text-sm text-[#324935]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(permission)}
                            onChange={() => togglePermission(permission)}
                            className="size-4 accent-[#0f5a2a]"
                          />
                          <span>{permission}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <button
                  type="submit"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#0f5a2a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#164f2a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9a51c]"
                >
                  Create role
                </button>
              </form>

              <form
                onSubmit={handleAssignRole}
                className="rounded-md border border-[#d8e8d3] bg-white p-4 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-[#103f20]">
                  Assign Role
                </h3>
                <p className="mt-1 text-sm text-[#657263]">
                  Apply a role to a staff account and record the change.
                </p>

                <div className="mt-4 grid gap-3">
                  <label>
                    <span className="text-sm font-medium text-[#324935]">
                      User
                    </span>
                    <select
                      value={assignmentUserId}
                      onChange={(event) =>
                        setAssignmentUserId(event.target.value)
                      }
                      className="mt-1 min-h-11 w-full rounded-md border border-[#c9d9c5] bg-[#fbfdf8] px-3 text-sm outline-none transition focus:border-[#0f5a2a] focus:ring-2 focus:ring-[#d9a51c]/45"
                    >
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.id})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="text-sm font-medium text-[#324935]">
                      Role
                    </span>
                    <select
                      value={assignmentRoleId}
                      onChange={(event) =>
                        setAssignmentRoleId(event.target.value)
                      }
                      className="mt-1 min-h-11 w-full rounded-md border border-[#c9d9c5] bg-[#fbfdf8] px-3 text-sm outline-none transition focus:border-[#0f5a2a] focus:ring-2 focus:ring-[#d9a51c]/45"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <button
                  type="submit"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#d9a51c] px-4 text-sm font-semibold text-[#143d22] shadow-sm transition hover:bg-[#e8b832] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f5a2a]"
                >
                  Assign role
                </button>
              </form>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-md border border-[#d8e8d3] bg-white p-4 shadow-sm">
              <h3 className="text-xl font-semibold text-[#103f20]">
                Role Registry
              </h3>
              <div className="mt-4 space-y-3">
                {roles.map((role) => (
                  <article
                    key={role.id}
                    className="rounded-md border border-[#edf3e9] bg-[#fbfdf8] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 size-3 shrink-0 rounded-sm ${role.color}`}
                        aria-hidden="true"
                      />
                      <div>
                        <h4 className="font-semibold text-[#173820]">
                          {role.name}
                        </h4>
                        <p className="mt-1 text-sm text-[#667468]">
                          {role.level}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {role.permissions.map((permission) => (
                            <span
                              key={permission}
                              className="rounded-md border border-[#d8e8d3] bg-white px-2 py-1 text-xs font-medium text-[#48614d]"
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div
              id="audit-logs"
              className="rounded-md border border-[#d8e8d3] bg-white shadow-sm"
            >
              <div className="flex flex-col gap-3 border-b border-[#e3eddf] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-[#103f20]">
                    User Logs
                  </h3>
                  <p className="mt-1 text-sm text-[#657263]">
                    Access, role, and record changes across PMB systems.
                  </p>
                </div>

                <div className="inline-flex rounded-md border border-[#d8e8d3] bg-[#fbfdf8] p-1">
                  {["All", "High", "Medium", "Low"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setLogFilter(item)}
                      className={`min-h-9 rounded px-3 text-sm font-semibold transition ${
                        logFilter === item
                          ? "bg-[#0f5a2a] text-white"
                          : "text-[#48614d] hover:bg-[#eef6ea]"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full text-left text-sm">
                  <thead className="bg-[#f2f7ef] text-xs uppercase tracking-[0.12em] text-[#59725f]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Time</th>
                      <th className="px-4 py-3 font-semibold">Actor</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                      <th className="px-4 py-3 font-semibold">Target</th>
                      <th className="px-4 py-3 font-semibold">Result</th>
                      <th className="px-4 py-3 font-semibold">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf3e9]">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#173820]">
                            {log.time}
                          </p>
                          <p className="mt-1 text-xs text-[#667468]">
                            {log.id}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-[#48584d]">
                          {log.actor}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-[#173820]">
                            {log.action}
                          </p>
                          <p className="mt-1 text-xs text-[#667468]">
                            {log.source}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-[#48584d]">
                          {log.target}
                        </td>
                        <td className="px-4 py-4 text-[#0f5a2a]">
                          {log.result}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex min-h-7 items-center rounded-md px-2.5 text-xs font-semibold ${severityClasses(
                              log.severity,
                            )}`}
                          >
                            {log.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
