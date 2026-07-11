/**
 * /cockpit/operate/roadmap → redirect /cockpit/operate/calendar?vue=actions
 *
 * Lot 13 (audit UX 2026-07-11) : le plan d'actions est devenu la vue
 * « Actions » du Calendrier unique — fin des trois « calendriers »
 * concurrents dans la nav. Redirect 308, aucun deep-link cassé.
 */

import { redirect } from "next/navigation";

export default function RoadmapRedirect() {
  redirect("/cockpit/operate/calendar?vue=actions");
}
