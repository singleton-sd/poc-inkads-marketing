import { aboutPageCms } from "./about.cms.ts";
import { advertisersPageCms } from "./advertisers.cms.ts";
import { contactPageCms } from "./contact.cms.ts";
import { faqPageCms } from "./faq.cms.ts";
import { homePageCms } from "./home.cms.ts";
import { howItWorksPageCms } from "./how-it-works.cms.ts";
import { placesPageCms } from "./places.cms.ts";
import { pricingPageCms } from "./pricing.cms.ts";
import { supportPageCms } from "./support.cms.ts";
import { venuesPageCms } from "./venues.cms.ts";

/** Alphabetical by file path so concurrent additions land on different lines. */
export const pageCmsEntries = [
  aboutPageCms,
  advertisersPageCms,
  contactPageCms,
  faqPageCms,
  homePageCms,
  howItWorksPageCms,
  placesPageCms,
  pricingPageCms,
  supportPageCms,
  venuesPageCms,
];
