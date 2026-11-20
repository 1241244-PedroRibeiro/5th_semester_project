# User management

Use a disposable target account: these requests change its roles. Set `baseUrl`, `managementUsername` (different from the acting accounts), `managementAdministratorEmail`/`managementAdministratorPassword`, and `managementManagerEmail`/`managementManagerPassword`. Both acting accounts must be ACTIVE. Run in order: assign EMPLOYEE + MANAGER, replace with EMPLOYEE, reject empty roles, reject manager access, and require authentication. Requests use `PUT /user/:username/roles` with the complete desired role array; successful writes return 200. The final target assignment is EMPLOYEE.

The backoffice administrator Users page exposes Manage for role changes and separately confirmed deactivation. Existing `DELETE /user/:username` behavior is unchanged. Automated HTTP tests cover pending/deactivated targets, existing-token permission changes and self-administrator protection; browser tests cover role editing and deactivation at 320px/1280px.


Reactivation: ACTIVE administrators can call `POST /user/:username/reactivate` for a DEACTIVATED target (204). ACTIVE or PENDING_REGISTRATION targets return 409. A role PUT on a DEACTIVATED target now returns 409 and preserves all assignments. Reactivate before running this folder's successful role-update requests. The Users dialog disables role edits until reactivation and switches the account action to Reactivate account.
