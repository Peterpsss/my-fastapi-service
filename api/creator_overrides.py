"""YOUR OWN CORRECTIONS - this is the one file to edit when a YouTuber is missing a banner, picture or top video.

Edit only the text between the two ''' marks below (it is JSON: keep every comma, quote and bracket). Save, push to
GitHub, and Vercel redeploys; the API copies your changes into the database by itself.
Whatever you leave as "" is ignored. A mistake is reported at /health (creator_overrides) and never breaks the site.
"""

OVERRIDES_TEXT = r'''
{
  "_help": [
    "HOW THIS WORKS: fill in the empty \"\" values below, save, then push to GitHub. Anything left as \"\" is ignored.",
    "banner = address of the banner image (on the channel page: right-click the banner > Copy image address). Must start with https://",
    "avatar = same idea for the round profile picture (add an \"avatar\": \"https://...\" line to any creator).",
    "popularVideo url = the address of their most-viewed video (copy it from the browser). The thumbnail is added automatically.",
    "popularVideo title / views = optional text shown next to it, e.g. \"1.2B views\".",
    "To fix someone who is not listed here, copy the \"_example\" block, rename it to the creator's name or @handle, and edit it.",
    "Other fields you can set per creator: bio, country, categories (a list like [\"Gaming\", \"Comedy\"]; the first one is the main category).",
    "Mistakes never break the site: a bad link is skipped and explained at /health under creator_overrides > warnings."
  ],
  "_example (copy me, rename me)": {
    "avatar": "https://example.com/profile.jpg",
    "banner": "https://example.com/banner.jpg",
    "bio": "Optional: a new description.",
    "country": "Optional: United States",
    "categories": [
      "Gaming",
      "Comedy"
    ],
    "popularVideo": {
      "url": "https://www.youtube.com/watch?v=VIDEO_ID",
      "title": "Video title",
      "views": "1.2B views"
    }
  },
  "Ninja": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Sidemen": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "LazarBeam": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Technoblade": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "TED-Ed": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Tasty": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Jake Paul": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "KSI": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "penguinz0": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "CrashCourse": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "David Dobrik": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "jeffreestar": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "TommyInnit": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Rosanna Pansino": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Vox": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Emma Chamberlain": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "CaptainSparklez": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Jubilee": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "blogilates": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Joshua Weissman": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Binging with Babish": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "JerryRigEverything": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Yes Theory": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Khan Academy": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "SciShow": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "shroud": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Peter McKinnon": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "minutephysics": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "NetworkChuck": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Matt D'Avella": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Dave2D": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Steve Mould": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "The Verge": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "UrAvgConsumer": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Android Authority": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "zollotech": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "TechLinked": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  },
  "Nate O'Brien": {
    "banner": "",
    "popularVideo": {
      "url": "",
      "title": "",
      "views": ""
    }
  }
}
'''
