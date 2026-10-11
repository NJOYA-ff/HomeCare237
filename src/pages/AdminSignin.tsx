/**
 * Admin sign-in is no longer a separate screen.
 *
 * Doctors and admins share a single staff sign-in interface (DoctorSignin),
 * which accepts both roles and routes each account to its own dashboard. This
 * module is kept as an alias so the existing `/Admin_signin` route, password
 * recovery back-links and tests continue to resolve to that one shared page.
 */
export { default } from "./DoctorSignin";
