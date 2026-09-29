const YOUTUBERS_DATA = [
    // --- GAMING ---
    {
        id: "yt1",
        name: "PewDiePie",
        handle: "@pewdiepie",
        niche: "Gaming",
        country: "Sweden",
        subscribers: "110M",
        rawSubs: 110000000,
        totalViews: "29.5B",
        rawViews: 29500000000,
        videoCount: 4750,
        avatar: "https://unavatar.io/youtube/pewdiepie?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=pewdiepie",
        banner: "https://yt3.googleusercontent.com/vg_f9mYBpTkhj44RPlyu4ZN_qUwpSGhQ5zwXLCwZpZUJ12EtQlMf-HwI6MtB1Nv6h8oN9W3emA=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Swedish creator known for gaming playthroughs, meme reviews, and legendary vlogs in Japan.",
        joinedYear: 2010,
        popularVideo: {
            title: "bitch lasagne",
            views: "320M views",
            thumb: "https://img.youtube.com/vi/HuIb3XTQVJw/hqdefault.jpg"
        }
    },
    {
        id: "yt2",
        name: "Markiplier",
        handle: "@markiplier",
        niche: "Gaming",
        country: "United States",
        subscribers: "38.8M",
        rawSubs: 38800000,
        totalViews: "23.8B",
        rawViews: 23800000000,
        videoCount: 5900,
        avatar: "https://unavatar.io/youtube/markiplier?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=markiplier",
        banner: "https://yt3.googleusercontent.com/rpKClmtqC5BqOpXwsh5iBVJiQw3xSGiyK8tMVgef9nUgIaXCYLBL26qhNeUn0Vq64MP9SblSmw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Let's Plays, indie horror games, comedy sketches, and high-budget interactive original series.",
        joinedYear: 2012,
        popularVideo: {
            title: "FIVE NIGHTS AT FREDDY'S - Part 1",
            views: "112M views",
            thumb: "https://img.youtube.com/vi/iOztnsBPrAA/hqdefault.jpg"
        }
    },
    {
        id: "yt3",
        name: "Jacksepticeye",
        handle: "@jacksepticeye",
        niche: "Gaming",
        country: "Ireland",
        subscribers: "31.2M",
        rawSubs: 31200000,
        totalViews: "17.7B",
        rawViews: 17700000000,
        videoCount: 5330,
        avatar: "https://unavatar.io/youtube/jacksepticeye?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=jacksepticeye",
        banner: "https://yt3.googleusercontent.com/MivpnEyaUnrQ8PkVWeJ-0i0vcKY-BApFFj_YbSclN030i1eIJTMB_SV-2aO-V-le2up-l2Pg8P4=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Top-energy Irish gamer bringing high enthusiasm, funny reactions, and indie game play-throughs.",
        joinedYear: 2007,
        popularVideo: {
            title: "ALL THE WAY - Jacksepticeye Songify Remix",
            views: "105M views",
            thumb: "https://img.youtube.com/vi/BJPc49z57bU/hqdefault.jpg"
        }
    },
    {
        id: "yt4",
        name: "RTGame",
        handle: "@rtgame",
        niche: "Gaming",
        country: "Ireland",
        subscribers: "2.95M",
        rawSubs: 2950000,
        totalViews: "1.51B",
        rawViews: 1510000000,
        videoCount: 1251,
        avatar: "https://yt3.ggpht.com/uEg1-XfHTF1-28XROsJmA5Hn8BdRIn7S_6lr1MkVVVk-qgfcphDyU1tK9oOmvFP14RbwQqJDAQ=s176-c-k-c0x00ffffff-no-rj-mo",
        banner: "https://yt3.googleusercontent.com/mVuYY_MUB2HorpZwypa3eJ_HS2C9vlnuh9FWqcC9lseiNjudrWZOH876GdESIEsq3abDoIoP=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Irish creator causing hilarious chaos in building games, simulators, and multiplayer streams.",
        joinedYear: 2011,
        popularVideo: {
            title: "I forced 200 players to build a city in Minecraft",
            views: "14M views",
            thumb: "https://img.youtube.com/vi/y_4Yp4gF604/hqdefault.jpg"
        }
    },
    {
        id: "yt5",
        name: "DanTDM",
        handle: "@dantdm",
        niche: "Gaming",
        country: "United Kingdom",
        subscribers: "29.1M",
        rawSubs: 29100000,
        totalViews: "20.4B",
        rawViews: 20400000000,
        videoCount: 3806,
        avatar: "https://unavatar.io/youtube/dantdm?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=dantdm",
        banner: "https://yt3.googleusercontent.com/im-XothcahoPj7tL2uc-VKJdvA944sdA7IwcPNi5Z0rHj4EIy2Xlm4JCigWx1dwj_PE85eJhSLw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "British gaming creator renowned for Minecraft adventures, mod reviews, and family-friendly gaming streams.",
        joinedYear: 2012,
        popularVideo: {
            title: "Minecraft Mod Showcase | Diamond Dimension",
            views: "52M views",
            thumb: "https://img.youtube.com/vi/N_UDeC59mLU/hqdefault.jpg"
        }
    },
    {
        id: "yt6",
        name: "CaptainSparklez",
        handle: "@captainsparklez",
        niche: "Gaming",
        country: "United States",
        subscribers: "11.4M",
        rawSubs: 11400000,
        totalViews: "4.18B",
        rawViews: 4180000000,
        videoCount: 5876,
        avatar: "https://yt3.googleusercontent.com/ytc/AIdro_l_117uPIAsJJJNkke5OiXRueHIDC0DUmNcLN70-KCsB8w=s176-c-k-c0x00ffffff-no-rj-mo",
        banner: "https://yt3.googleusercontent.com/HjXtCTrLvEOCO2PekFcRJ6FxTeSzuFpC_CSPYkDk3q-LxSoOXgv4xaw32mXgMLAj6NkW0H9l=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Pioneer Minecraft YouTuber famous for viral music videos, game survival series, and fitness vlogs.",
        joinedYear: 2010,
        popularVideo: {
            title: "'Revenge' - A Minecraft Parody of Usher's DJ Got Us Fallin' In Love",
            views: "285M views",
            thumb: "https://img.youtube.com/vi/cPJUBQd-PNM/hqdefault.jpg"
        }
    },

    // --- ENTERTAINMENT ---
    {
        id: "yt7",
        name: "MrBeast",
        handle: "@mrbeast",
        niche: "Entertainment",
        country: "United States",
        subscribers: "508M",
        rawSubs: 508000000,
        totalViews: "133.7B",
        rawViews: 133700000000,
        videoCount: 992,
        avatar: "https://unavatar.io/youtube/mrbeast?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=mrbeast",
        banner: "https://yt3.googleusercontent.com/mHMO_eEMp0dPvh0ADwXhPXNYb_GnjSVsLI8biqF1CpxT8OPl7izhNQsDPD3JHhd5y5Mg9GrP=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Massive stunt challenges, philanthropy giveaways, and record-breaking YouTube spectacles.",
        joinedYear: 2012,
        popularVideo: {
            title: "$456,000 Squid Game In Real Life!",
            views: "640M views",
            thumb: "https://img.youtube.com/vi/0e3GPea1Tyg/hqdefault.jpg"
        }
    },
    {
        id: "yt8",
        name: "Dude Perfect",
        handle: "@dudeperfect",
        niche: "Entertainment",
        country: "United States",
        subscribers: "62.3M",
        rawSubs: 62300000,
        totalViews: "20.9B",
        rawViews: 20900000000,
        videoCount: 577,
        avatar: "https://unavatar.io/youtube/dudeperfect?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=dudeperfect",
        banner: "https://yt3.googleusercontent.com/mDfeVureDDN0V0OAGV9Fib3-mLZZiflI75Dg6t7QjW9sjUnhVSHRFcPK8Ni11dHLzeEBwE55B8c=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "5 guys pushing the limits of trick shots, sports comedy, and absurd physical challenges.",
        joinedYear: 2009,
        popularVideo: {
            title: "Water Bottle Flip 2 | Dude Perfect",
            views: "440M views",
            thumb: "https://img.youtube.com/vi/VJwoSfTOhyM/hqdefault.jpg"
        }
    },
    {
        id: "yt9",
        name: "Ryan Trahan",
        handle: "@ryantrahan",
        niche: "Entertainment",
        country: "United States",
        subscribers: "23.5M",
        rawSubs: 23500000,
        totalViews: "6.3B",
        rawViews: 6300000000,
        videoCount: 511,
        avatar: "https://yt3.googleusercontent.com/fiJrCXLTjjY531uelhbpUD21Cb0iMb6vF21M6-H7ZhjMZPe2cAkIeB9yWUHtENkFhq1F3oVbgg=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/kD7PV6ngb9uH9d1yWws--uTK_8aM5U4ImQnldgUe1ffy5sFnQEPyMmFbSKz7NP6tALoQJJZqpWU=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Challenge creator famous for penny cross-country trips, testing bizarre products, and fundraising.",
        joinedYear: 2013,
        popularVideo: {
            title: "I Survived On $0.01 For 30 Days",
            views: "38M views",
            thumb: "https://img.youtube.com/vi/JEqi3VVLYkg/hqdefault.jpg"
        }
    },
    {
        id: "yt10",
        name: "Michelle Khare",
        handle: "@michellekhare",
        niche: "Entertainment",
        country: "United States",
        subscribers: "5.4M",
        rawSubs: 5400000,
        totalViews: "900M",
        rawViews: 900000000,
        videoCount: 261,
        avatar: "https://yt3.googleusercontent.com/ytc/AIdro_ll42qUILSk__20jYy2w6SH2qgOkWgQAK383pCJ-V_P07o=s176-c-k-c0x00ffffff-no-rj-mo",
        banner: "https://yt3.googleusercontent.com/7rZPWBicmgcRpZ-L_EuGwdWTfKVRcw2hRKhbvPK74w1BIUirsgtEp0HulThn6UZMxzvyt2-9qw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Host of 'Challenge Accepted', training alongside elite firefighters, FBI agents, and stunt performers.",
        joinedYear: 2016,
        popularVideo: {
            title: "I Tried FBI Hostage Rescue Training",
            views: "18M views",
            thumb: "https://img.youtube.com/vi/uow257PdFCE/hqdefault.jpg"
        }
    },
    {
        id: "yt11",
        name: "Zach King",
        handle: "@zachking",
        niche: "Entertainment",
        country: "United States",
        subscribers: "43.1M",
        rawSubs: 43100000,
        totalViews: "23.2B",
        rawViews: 23200000000,
        videoCount: 856,
        avatar: "https://unavatar.io/youtube/zachking?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=zachking",
        banner: "https://yt3.googleusercontent.com/MBKg3sMjssTFBazW6vtOg9I74CufwFA0yQsLfHU1sB-N4gKvNC8ZikvyuUhgoedQPNZiobYs0g=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Filmmaker and illusionist famous for seamless digital magic cuts and mind-bending short films.",
        joinedYear: 2008,
        popularVideo: {
            title: "Zach King's Best Magic Tricks Ever",
            views: "180M views",
            thumb: "https://img.youtube.com/vi/Yqtlg2f8m4w/hqdefault.jpg"
        }
    },
    {
        id: "yt12",
        name: "Airrack",
        handle: "@airrack",
        niche: "Entertainment",
        country: "United States",
        subscribers: "18.5M",
        rawSubs: 18500000,
        totalViews: "4.7B",
        rawViews: 4700000000,
        videoCount: 285,
        avatar: "https://yt3.ggpht.com/B6mcXnYXqha3Aaofo5J_jqP6XBUEW9GvMQMNGvwFN93UvNwF7kdlKNnxEQ5HBmYHpRq-SBogxg=s176-c-k-c0x00ffffff-no-rj-mo",
        banner: "https://yt3.googleusercontent.com/PrxQWbusgYOT2PQ59ATtvOr0UTSDbOs6Le70x8Vf-Xu9ND9BECXipBxu9C3ZvkGfC42sIX5Fiw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Eric Decker produces high-intensity stunt videos, wild community stunts, and world record attempts.",
        joinedYear: 2015,
        popularVideo: {
            title: "I Built The World's Largest Pizza",
            views: "31M views",
            thumb: "https://img.youtube.com/vi/LrTKeT8xBRg/hqdefault.jpg"
        }
    },

    // --- EDUCATION ---
    {
        id: "yt13",
        name: "Veritasium",
        handle: "@veritasium",
        niche: "Education",
        country: "Australia",
        subscribers: "20.8M",
        rawSubs: 20800000,
        totalViews: "4.3B",
        rawViews: 4300000000,
        videoCount: 507,
        avatar: "https://yt3.ggpht.com/7vCbvtCqtjQ3YLgsJt7Y952MQV1sBvhllSCSxHP8_sVZdcPCBrITfhkN2RdyCuwPnsByq-1GoA=s176-c-k-c0x00ffffff-no-rj-mo",
        banner: "https://yt3.googleusercontent.com/sDCGwJYqtOxT-odxPiErdlwfq3jlzXh0TsYFXtSSD6rld0Be51ZUNcoE17di2u1OiCjQunbcqA=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "An element of truth - deep science videos, mind-bending physics experiments, and counterintuitive math.",
        joinedYear: 2010,
        popularVideo: {
            title: "The Bizarre Behavior of Rotating Bodies",
            views: "62M views",
            thumb: "https://img.youtube.com/vi/1VPfZ_XzisU/hqdefault.jpg"
        }
    },
    {
        id: "yt14",
        name: "Mark Rober",
        handle: "@markrober",
        niche: "Education",
        country: "United States",
        subscribers: "81M",
        rawSubs: 81000000,
        totalViews: "18B",
        rawViews: 18000000000,
        videoCount: 265,
        avatar: "https://unavatar.io/youtube/markrober?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=markrober",
        banner: "https://yt3.googleusercontent.com/MpHjfKLT09ZFt2efg6wW9r6qiKJpPhP8TWV15NJXD6ZYsekvY2dFlTR11ydf-psl7AjX4M_ikw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Ex-NASA engineer building glitterbombs, giant maze tests for squirrels, and science education setups.",
        joinedYear: 2011,
        popularVideo: {
            title: "Glitterbomb 5.0 vs Porch Pirates",
            views: "125M views",
            thumb: "https://img.youtube.com/vi/iWeu2dxHRDg/hqdefault.jpg"
        }
    },
    {
        id: "yt15",
        name: "Kurzgesagt – In a Nutshell",
        handle: "@kurzgesagt",
        niche: "Education",
        country: "Germany",
        subscribers: "25.3M",
        rawSubs: 25300000,
        totalViews: "3.75B",
        rawViews: 3750000000,
        videoCount: 375,
        avatar: "https://yt3.googleusercontent.com/ytc/AIdro_n1Ribd7LwdP_qKtqWL3ZDfIgv9M1d6g78VwpHGXVR2Ir4=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/8sT9BbnbNORM5aSzSyHDFV_1ItIwaiLq4ctD4aLeMJnLiZYNCr73eN_-0Xrhy5joVL_Ewet5=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Animated videos explaining space, humanity, biology, existential risks, and optimistic nihilism.",
        joinedYear: 2013,
        popularVideo: {
            title: "The Egg - A Short Story",
            views: "35M views",
            thumb: "https://img.youtube.com/vi/h6fcK_fRYaI/hqdefault.jpg"
        }
    },
    {
        id: "yt16",
        name: "Steve Mould",
        handle: "@stevemould",
        niche: "Education",
        country: "United Kingdom",
        subscribers: "3.55M",
        rawSubs: 3550000,
        totalViews: "1.06B",
        rawViews: 1060000000,
        videoCount: 375,
        avatar: "https://yt3.googleusercontent.com/iX-akiHlJYuPDq4YVBO83cfjWW0aQefdewmI326XVhZkzxnS3MrqNVi49J33jLBw5LR_ZVyKFA=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/tayEfGBw7rz5Kec_-Z4sN21m1gzBKEEYJXYRLI_GbGu8wVl8INWft32kgYEIcRr1P0ho6kHd=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Science presenter explaining odd physical phenomena, fluid dynamics, and clever mechanical devices.",
        joinedYear: 2006,
        popularVideo: {
            title: "The Chain Fountain Phenomenon Explained",
            views: "12M views",
            thumb: "https://img.youtube.com/vi/-eEi7fO0_O0/hqdefault.jpg"
        }
    },
    {
        id: "yt17",
        name: "Vsauce",
        handle: "@vsauce",
        niche: "Education",
        country: "United States",
        subscribers: "24.8M",
        rawSubs: 24800000,
        totalViews: "6.6B",
        rawViews: 6600000000,
        videoCount: 641,
        avatar: "https://unavatar.io/youtube/vsauce?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=vsauce",
        banner: "https://yt3.googleusercontent.com/KqAxDwNOr6d1i7viCH6H0Xfx-jpeIyPmnrVfgQNrRhUiidcs4RSSMT1UIE2dPUH_gD8INmza=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Michael Stevens delves into deep philosophical questions, scientific mysteries, and human psychology.",
        joinedYear: 2010,
        popularVideo: {
            title: "What If Everyone Jumped At Once?",
            views: "41M views",
            thumb: "https://img.youtube.com/vi/jHbyQ_AQP8c/hqdefault.jpg"
        }
    },
    {
        id: "yt18",
        name: "SmarterEveryDay",
        handle: "@smartereveryday",
        niche: "Education",
        country: "United States",
        subscribers: "11.9M",
        rawSubs: 11900000,
        totalViews: "1.27B",
        rawViews: 1270000000,
        videoCount: 396,
        avatar: "https://yt3.googleusercontent.com/ytc/AIdro_l59Ewmp0DHZBRWbY9dVqjd2_mWwvrn8ad0bJfmdbMRYcA=s176-c-k-c0x00ffffff-no-rj-mo",
        banner: "https://yt3.googleusercontent.com/Y55JnMQhAnrzZOTLa3Xk_iiAHR80ct1ytTQ_Omcdv84E-AM0gv-himJ84qtfzj9dWvsAlm07Cg=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Destin Sandlin explores the world through science, ultra high-speed cameras, and engineering tours.",
        joinedYear: 2006,
        popularVideo: {
            title: "Tattooing Close Up In Slow Motion",
            views: "48M views",
            thumb: "https://img.youtube.com/vi/8G-K7i4tTRI/hqdefault.jpg"
        }
    },

    // --- TECH & GADGETS ---
    {
        id: "yt19",
        name: "Marques Brownlee (MKBHD)",
        handle: "@mkbhd",
        niche: "Tech & Gadgets",
        country: "United States",
        subscribers: "21M",
        rawSubs: 21000000,
        totalViews: "5.4B",
        rawViews: 5400000000,
        videoCount: 1821,
        avatar: "https://yt3.googleusercontent.com/qu4TmIaYUlS41-dJ9gZ7DUR3nilvmB5_11i6OKSdvNnBNiyOusZP1bMN6ICnuxtjFBb6ioKgRQ=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/zi_48HwHU4s0Hnb6tZuvRzTfCPHrLEnrtIMDLzMauDEyDmURh9JZ4wrNd3lKr7m9uVnT4YjYKw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Quality tech videos, smartphone reviews, EV breakdowns, and crisp studio production.",
        joinedYear: 2008,
        popularVideo: {
            title: "Apple Vision Pro Review: Tomorrow's Tech Today!",
            views: "24M views",
            thumb: "https://img.youtube.com/vi/86Gy035z_KA/hqdefault.jpg"
        }
    },
    {
        id: "yt20",
        name: "Linus Tech Tips",
        handle: "@linustechtips",
        niche: "Tech & Gadgets",
        country: "Canada",
        subscribers: "16.9M",
        rawSubs: 16900000,
        totalViews: "9.7B",
        rawViews: 9700000000,
        videoCount: 7882,
        avatar: "https://yt3.ggpht.com/gnvYLhXy8FAlPXZ2RTrkrgj-5kyt0vdE2FUGVOiKGdEZIa-wN5A-7nwZBlWJLzUMmoh1NWAU=s176-c-k-c0x00ffffff-no-rj-mo",
        banner: "https://yt3.googleusercontent.com/U_7GWetO6k4sq3pAkbFEIIWzZLKcIJlGJqNz6NQAhgqF6DVD5pllwWF6trSUWEIRn4MkhNlhy9Y=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "PC building, server hardware setups, consumer technology tests, and funny workshop experiments.",
        joinedYear: 2008,
        popularVideo: {
            title: "Building a PC... in a Desk!",
            views: "28M views",
            thumb: "https://img.youtube.com/vi/ytpK6nhsfqI/hqdefault.jpg"
        }
    },
    {
        id: "yt21",
        name: "Mrwhosetheboss",
        handle: "@mrwhosetheboss",
        niche: "Tech & Gadgets",
        country: "United Kingdom",
        subscribers: "22.5M",
        rawSubs: 22500000,
        totalViews: "8.6B",
        rawViews: 8600000000,
        videoCount: 1908,
        avatar: "https://unavatar.io/youtube/mrwhosetheboss?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=mrwhosetheboss",
        banner: "https://yt3.googleusercontent.com/LMWJHfAWq4USLdbuHfbJv4r6HtCl7YM6O63sVL3j0xLjyLBaAjc_5KocBtUAiqJjZJqmpVwnnw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Arun Maini reviews wild smartphones, future gadgets, camera showdowns, and luxury tech.",
        joinedYear: 2011,
        popularVideo: {
            title: "I Bought the World's Most Expensive Tech!",
            views: "42M views",
            thumb: "https://img.youtube.com/vi/kMiy8ZywF88/hqdefault.jpg"
        }
    },
    {
        id: "yt22",
        name: "The Verge",
        handle: "@theverge",
        niche: "Tech & Gadgets",
        country: "United States",
        subscribers: "3.5M",
        rawSubs: 3500000,
        totalViews: "1.14B",
        rawViews: 1140000000,
        videoCount: 6219,
        avatar: "https://yt3.ggpht.com/ZIj_dq7beCkAkhufNqCid_SjWW4mkv4tqIDtv7_AAKzWdhBWI-rpsRXYXB9X3mB0s0zNzNtYdQ=s176-c-k-c0x00ffffff-no-rj-mo",
        banner: "https://yt3.googleusercontent.com/M_BOrRfV6PuUX62DHgwPaz9eWUsy1_bg_d1LEoBi_bWpSgiNcCs8MJ2kV09xc9fCX3naUWe5=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Covering the intersection of technology, science, art, and culture with deep reviews.",
        joinedYear: 2011,
        popularVideo: {
            title: "Humane AI Pin Review: Not Quite Ready",
            views: "8.5M views",
            thumb: "https://img.youtube.com/vi/_w1vv7_dU2Y/hqdefault.jpg"
        }
    },
    {
        id: "yt23",
        name: "Unbox Therapy",
        handle: "@unboxtherapy",
        niche: "Tech & Gadgets",
        country: "Canada",
        subscribers: "25M",
        rawSubs: 25000000,
        totalViews: "5.1B",
        rawViews: 5100000000,
        videoCount: 2479,
        avatar: "https://unavatar.io/youtube/unboxtherapy?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=unboxtherapy",
        banner: "https://yt3.googleusercontent.com/zHy3KytBCT-2s8e6XBAMomdqvRGCMuRifit_5ARx6eQoBmz4m57ivW4JTjNcvJFlY0id5lI8=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Lewis Hilsenteger unboxes futuristic gadgets, smartphones, custom PCs, and insane gadgets.",
        joinedYear: 2010,
        popularVideo: {
            title: "iPhone 6 Plus Bend Test",
            views: "74M views",
            thumb: "https://img.youtube.com/vi/znK652H6yQM/hqdefault.jpg"
        }
    },
    {
        id: "yt24",
        name: "JerryRigEverything",
        handle: "@jerryrigeverything",
        niche: "Tech & Gadgets",
        country: "United States",
        subscribers: "10M",
        rawSubs: 10000000,
        totalViews: "3B",
        rawViews: 3000000000,
        videoCount: 1567,
        avatar: "https://yt3.ggpht.com/ebXyJhsgpfIHg4PXw3eSFTeSx6Ud1us26Gwgshe9jPBvSu82SpQkFmc1GK7q2Go2KJePYQ5Icg=s176-c-k-c0x00ffffff-no-rj-mo",
        banner: "https://yt3.googleusercontent.com/LEoSUpBX3yPIN9SkOK6CkqVIIA8VLIuTZP4SzlB3BJ-Hd1RxbReli-c9KH6RGP1HbltyKRK42HA=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Zack Nelson conducts durability scratch/bend tests on modern smartphones and builds custom wheelchair tech.",
        joinedYear: 2012,
        popularVideo: {
            title: "Durability Test on the Latest Flagship Phone",
            views: "29M views",
            thumb: "https://img.youtube.com/vi/smWBfgJP9qw/hqdefault.jpg"
        }
    },

    // --- LIFESTYLE & VLOG ---
    {
        id: "yt25",
        name: "Casey Neistat",
        handle: "@caseyneistat",
        niche: "Lifestyle & Vlog",
        country: "United States",
        subscribers: "12.7M",
        rawSubs: 12700000,
        totalViews: "3.26B",
        rawViews: 3260000000,
        videoCount: 1143,
        avatar: "https://yt3.googleusercontent.com/ytc/AIdro_n4AHNRd0upuWqg3NZq4iXWP5JSbnKHh_nbzhOmgGzUc3k=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/bPRbbDYVGwzIst9hnf-F46pAxrCFaT1kI4SWMQcVXhsGWoXYRNp0u55mrvtvQhsTv4jKz4Dc=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Filmmaker based in NYC known for pioneering modern daily vlogging, filmmaking tips, and gear tests.",
        joinedYear: 2010,
        popularVideo: {
            title: "THE $21,000 FIRST CLASS AIRPLANE SEAT",
            views: "82M views",
            thumb: "https://img.youtube.com/vi/84WIaK3bl_s/hqdefault.jpg"
        }
    },
    {
        id: "yt26",
        name: "Emma Chamberlain",
        handle: "@emmachamberlain",
        niche: "Lifestyle & Vlog",
        country: "United States",
        subscribers: "12.0M",
        rawSubs: 12000000,
        totalViews: "1.72B",
        rawViews: 1720000000,
        videoCount: 308,
        avatar: "https://yt3.ggpht.com/zDSI5VOhKgSHZMOihPFJGh4NmgHu1fI7bVYp8lhTuhnwhDBECt-Hgs1nm69dCn23aXZZAtCQ7g=s176-c-k-c0x00ffffff-no-rj-mo",
        banner: "https://yt3.googleusercontent.com/VAL102zJ--5gPxmU2VEUllus7rjfGq4tek_rbYcUnsCkWCxDtK1MUJReWdwxKQUxhQAC_xPA3Q=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Unfiltered lifestyle vlogs, fashion breakdowns, coffee culture, and candid personal thoughts.",
        joinedYear: 2016,
        popularVideo: {
            title: "ROAD TRIP TO LA ALONE",
            views: "18M views",
            thumb: "https://img.youtube.com/vi/pSkiCulsmXk/hqdefault.jpg"
        }
    },
    {
        id: "yt27",
        name: "Matt D'Avella",
        handle: "@mattdavella",
        niche: "Lifestyle & Vlog",
        country: "United States",
        subscribers: "4.04M",
        rawSubs: 4040000,
        totalViews: "331M",
        rawViews: 331000000,
        videoCount: 467,
        avatar: "https://yt3.googleusercontent.com/Ldpkcur-En5Qn8rcowaWiU6xbNt_yMrs1mAVcSRBIOdq0tSyTmGGIALRcgfm1a8aGKgYiYDEIQ=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/W3qXJg-GZ_3Jd9eNQFWUa11vGUgR_vI-YgUihir-AaxK0sauckotYTmyWDf9pguWFpaxSzcI-4w=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Filmmaker and minimalist exploring self-improvement, productivity habits, and intentional living.",
        joinedYear: 2011,
        popularVideo: {
            title: "I quit sugar for 30 days",
            views: "15M views",
            thumb: "https://img.youtube.com/vi/Ufm0yPA-kWc/hqdefault.jpg"
        }
    },
    {
        id: "yt28",
        name: "Nate O'Brien",
        handle: "@nateobrien",
        niche: "Lifestyle & Vlog",
        country: "United States",
        subscribers: "1.29M",
        rawSubs: 1290000,
        totalViews: "75M",
        rawViews: 75000000,
        videoCount: 201,
        avatar: "https://yt3.googleusercontent.com/ytc/AIdro_mBYiJT291tz86ZN-6UCN1_NciX5rbtJ1YProSDI21KcP4=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXKLf6VXPwsmLr6xySQ8HLdMejyCHB26g8pkqrcxmyeg&s=10",
        bio: "Personal finance vlogs, productivity routines, minimal living, and smart money habits for young adults.",
        joinedYear: 2016,
        popularVideo: {
            title: "How To Manage Your Money Like The 1%",
            views: "4.5M views",
            thumb: "https://img.youtube.com/vi/IfpAjsytwy0/hqdefault.jpg"
        }
    },
    {
        id: "yt29",
        name: "Ali Abdaal",
        handle: "@aliabdaal",
        niche: "Lifestyle & Vlog",
        country: "United Kingdom",
        subscribers: "6.63M",
        rawSubs: 6630000,
        totalViews: "549M",
        rawViews: 549000000,
        videoCount: 1435,
        avatar: "https://yt3.googleusercontent.com/ytc/AIdro_m2xx6mCZwsyjARnkwBKJxEv0FqGxGS2NwWNkjWH__Smw=s176-c-k-c0x00ffffff-no-rj-mo",
        banner: "https://yt3.googleusercontent.com/svcpijQsPYAMqJ4STw-TS5Q-W-QlgundKebuo_3LQn-nkfQkhHO1dWBRhfi9PZZmYfhdNdAEuw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Ex-doctor turned productivity author sharing evidence-based strategies for work-life balance and learning.",
        joinedYear: 2007,
        popularVideo: {
            title: "How I Type at 150 wpm - Speed Typing Tips",
            views: "11M views",
            thumb: "https://img.youtube.com/vi/1ArVtCQqQRE/hqdefault.jpg"
        }
    },
    {
        id: "yt30",
        name: "Peter McKinnon",
        handle: "@petermckinnon",
        niche: "Lifestyle & Vlog",
        country: "Canada",
        subscribers: "6.0M",
        rawSubs: 6000000,
        totalViews: "652M",
        rawViews: 652000000,
        videoCount: 838,
        avatar: "https://yt3.ggpht.com/MGXZihlZFGjJEP3ew_ptOdSfvx1jXFXlMGrEuNMD864fp17F4rEqIEboNxljlw0kJpr3Ss6qRw=s176-c-k-c0x00ffffff-no-rj-mo",
        banner: "https://yt3.googleusercontent.com/aYnlw9S6NKvKnZrFNELYKFYBwTN7KHrWGlyeur0Pvc9dyIpfkMjadzSAHqcn2_-D0cSc6PNXL_4=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Canadian photographer and cinematographer making vlogs on camera techniques, editing, and cinematic travel.",
        joinedYear: 2010,
        popularVideo: {
            title: "8 CAMERA HACKS IN 90 SECONDS",
            views: "12M views",
            thumb: "https://img.youtube.com/vi/5PXCa6RCG28/hqdefault.jpg"
        }
    },

    // --- MUSIC ---
    {
        id: "yt31",
        name: "T-Series",
        handle: "@tseries",
        niche: "Music",
        country: "India",
        subscribers: "314M",
        rawSubs: 314000000,
        totalViews: "350B",
        rawViews: 350000000000,
        videoCount: 26780,
        avatar: "https://unavatar.io/youtube/tseries?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=tseries",
        banner: "https://yt3.googleusercontent.com/8MckUeYPMXcjwGpWo2S8aucEZrtxspuRi8SAGA6NrIr1AyDS14Qn9MB_1pYBqB88VDbyEIrY=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "India's largest music label and movie studio, streaming Bollywood soundtracks, trailers, and devotional music.",
        joinedYear: 2006,
        popularVideo: {
            title: "Kesariya (Brahmastra)",
            views: "1B+ views",
            thumb: "https://img.youtube.com/vi/g6fnFALEseI/hqdefault.jpg"
        }
    },
    {
        id: "yt32",
        name: "BLACKPINK",
        handle: "@BLACKPINK",
        niche: "Music",
        country: "South Korea",
        subscribers: "102M",
        rawSubs: 102000000,
        totalViews: "43B",
        rawViews: 43000000000,
        videoCount: 666,
        avatar: "https://yt3.googleusercontent.com/U3VrCkKjzTpQ3VYv4SCPjNfDHeJV-swGNnhLYhr0nV4lZz_GVUNzK4EB-HFRfKv9S5VNh14uAg=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/BvXg7qBePlr2_7rQ-lkmPoSKJZjQp6hpSskepfu5z2S29AagNhU-j5DqkmBWhUsOtuqWbGSbCw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "K-pop quartet Jisoo, Jennie, Rosé, and Lisa — the most-subscribed music act and most-viewed band on YouTube.",
        joinedYear: 2016,
        popularVideo: {
            title: "DDU-DU DDU-DU",
            views: "2.1B views",
            thumb: "https://img.youtube.com/vi/IHNzOHi8sJs/hqdefault.jpg"
        }
    },
    {
        id: "yt33",
        name: "Justin Bieber",
        handle: "@justinbieber",
        niche: "Music",
        country: "Canada",
        subscribers: "79M",
        rawSubs: 79000000,
        totalViews: "39.1B",
        rawViews: 39100000000,
        videoCount: 283,
        avatar: "https://unavatar.io/youtube/justinbieber?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=justinbieber",
        banner: "https://yt3.googleusercontent.com/I11tXMm1tR2gfLofb14b-MIqD0m91dDu43MmMPMcp9CkM6dfyMoMYAEXsMT7NDx2bY-eCZBf=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Pop superstar and the most-subscribed male solo artist channel, home to music videos and behind-the-scenes footage.",
        joinedYear: 2007,
        popularVideo: {
            title: "Sorry",
            views: "3.6B views",
            thumb: "https://img.youtube.com/vi/fRh_vgS2dFE/hqdefault.jpg"
        }
    },
    {
        id: "yt34",
        name: "Taylor Swift",
        handle: "@taylorswift",
        niche: "Music",
        country: "United States",
        subscribers: "63.3M",
        rawSubs: 63300000,
        totalViews: "46B",
        rawViews: 46000000000,
        videoCount: 660,
        avatar: "https://unavatar.io/youtube/taylorswift?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=taylorswift",
        banner: "https://yt3.googleusercontent.com/8sOr6p2L8E8HAYtYcAz5Nm3oSRlpMQ14-P3kYsTPPqt1T4IvbAk0bNwdHubvclgQ4_nmwm1mGzU=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Singer-songwriter's official channel for music videos, live performances, and era-spanning visual releases.",
        joinedYear: 2006,
        popularVideo: {
            title: "Shake It Off",
            views: "3.5B views",
            thumb: "https://img.youtube.com/vi/nfWlot6h_JM/hqdefault.jpg"
        }
    },
    {
        id: "yt35",
        name: "Ed Sheeran",
        handle: "@EdSheeran",
        niche: "Music",
        country: "United Kingdom",
        subscribers: "59.2M",
        rawSubs: 59200000,
        totalViews: "38.5B",
        rawViews: 38500000000,
        videoCount: 781,
        avatar: "https://unavatar.io/youtube/edsheeran?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=edsheeran",
        banner: "https://yt3.googleusercontent.com/kN8Ma9EBKOsSy30--Se6MVAPJtRn6GSXV2grb0b9gZukJP_C2fk61YpfNQX4QXo5DnmwuQJN=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "British singer-songwriter blending folk, pop, and hip-hop, with several videos in YouTube's Billion Views Club.",
        joinedYear: 2010,
        popularVideo: {
            title: "Shape of You",
            views: "6.4B views",
            thumb: "https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg"
        }
    },
    {
        id: "yt36",
        name: "Marshmello",
        handle: "@Marshmello",
        niche: "Music",
        country: "United States",
        subscribers: "58.6M",
        rawSubs: 58600000,
        totalViews: "18.1B",
        rawViews: 18100000000,
        videoCount: 581,
        avatar: "https://yt3.googleusercontent.com/_GYRbg3_acyrsmJbhqHV15sM-Z75gAHqV1uFXXkxIPdsauNqFBXpaXsn6OlwGNGBSm4gu8tYKvY=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/kwET9YG7yJldSlJ7Z5sd3W5xPSMMwp_an-vsgTlaVSf046_cEyNejs0o64A3hwfBr9M3yvAEWA=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Masked electronic DJ-producer known for chart-topping EDM collabs and high-energy dance music videos.",
        joinedYear: 2015,
        popularVideo: {
            title: "Alone",
            views: "1.2B views",
            thumb: "https://img.youtube.com/vi/ALZHF5UqnU8/hqdefault.jpg"
        }
    },
    {
        id: "yt37",
        name: "Billie Eilish",
        handle: "@BillieEilish",
        niche: "Music",
        country: "United States",
        subscribers: "58.4M",
        rawSubs: 58400000,
        totalViews: "23.1B",
        rawViews: 23100000000,
        videoCount: 204,
        avatar: "https://unavatar.io/youtube/billieeilish?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=billieeilish",
        banner: "https://yt3.googleusercontent.com/WiRxJx_IbxwkZiqkNp3cXHkKGBYoFFxOjrnPlSxU9B6kXowLUUTQQqwvMVplqmOJ6pX9p2Yp-y8=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Genre-bending pop artist known for moody, whisper-close vocals and boundary-pushing music videos.",
        joinedYear: 2015,
        popularVideo: {
            title: "bad guy",
            views: "1.5B views",
            thumb: "https://img.youtube.com/vi/DyDfgMOUjCI/hqdefault.jpg"
        }
    },
    {
        id: "yt38",
        name: "Ariana Grande",
        handle: "@ArianaGrande",
        niche: "Music",
        country: "United States",
        subscribers: "57.7M",
        rawSubs: 57700000,
        totalViews: "32.8B",
        rawViews: 32800000000,
        videoCount: 277,
        avatar: "https://unavatar.io/youtube/arianagrande?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=arianagrande",
        banner: "https://yt3.googleusercontent.com/FHShfO_dj2guwt9LEqOS4ANxAQGMLMF3JLj6xxVkB7LyrmYJiNCFMuQCyMXRTDsQaLxyPNJKvQ=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Pop vocalist and the most-subscribed female solo artist channel, with several videos over a billion views.",
        joinedYear: 2007,
        popularVideo: {
            title: "thank u, next",
            views: "1B+ views",
            thumb: "https://img.youtube.com/vi/gl1aHhXnN1k/hqdefault.jpg"
        }
    },
    {
        id: "yt39",
        name: "Bad Bunny",
        handle: "@badbunny",
        niche: "Music",
        country: "Puerto Rico",
        subscribers: "53.1M",
        rawSubs: 53100000,
        totalViews: "48.8B",
        rawViews: 48800000000,
        videoCount: 190,
        avatar: "https://yt3.googleusercontent.com/Ys37SrZ6B7RUW8_X3YvQet7VCFNnWa5C5PXe09OgIoY9UkTt1GpP_zap1-w2VF5gZcyS5xQmbJs=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/I5XjJuuIDxkznqlyHg7OtRCwbZ6gVppUsnykf6jEGGMGU-L9t755nsCRnA-8EnqOBw_grGge8w=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Puerto Rican reggaetón and Latin trap superstar, one of the most-streamed artists in the world.",
        joinedYear: 2016,
        popularVideo: {
            title: "Tití Me Preguntó",
            views: "800M+ views",
            thumb: "https://img.youtube.com/vi/QpKkNIT84GY/hqdefault.jpg"
        }
    },
    {
        id: "yt40",
        name: "Rihanna",
        handle: "@rihanna",
        niche: "Music",
        country: "Barbados",
        subscribers: "46.2M",
        rawSubs: 46200000,
        totalViews: "29.6B",
        rawViews: 29600000000,
        videoCount: 94,
        avatar: "https://unavatar.io/youtube/rihanna?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=rihanna",
        banner: "https://yt3.googleusercontent.com/6IUlZSX1-CyUXV3o3KJvNX8eFJkdtJYAB_Ny23E_rjNWsw2w0xfn1UFkS24vPurmUmN5ysPh7qs=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Barbadian singer and pop icon whose catalogue includes several multi-billion-view music videos.",
        joinedYear: 2006,
        popularVideo: {
            title: "Diamonds",
            views: "1.9B views",
            thumb: "https://img.youtube.com/vi/lWA2pjMjpBs/hqdefault.jpg"
        }
    },

    // --- GAMING (cont.) ---
    {
        id: "yt41",
        name: "Ninja",
        handle: "@Ninja",
        niche: "Gaming",
        country: "United States",
        subscribers: "24M",
        rawSubs: 24000000,
        totalViews: "3B",
        rawViews: 3000000000,
        videoCount: 4300,
        avatar: "https://unavatar.io/youtube/ninja?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=ninja",
        banner: "https://yt3.googleusercontent.com/eVoKFLfpzg_rjb4dlO26pABcnKvshzVUueRhX0k9IXRKKceMFWV6oHsHXl6TPjW1CFkBJuIz=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Tyler Blevins, one of gaming's breakout streaming stars, known for Fortnite highlights and battle royale content.",
        joinedYear: 2011,
        popularVideo: {
            title: "Fortnite World Record Squad Win",
            views: "20M+ views",
            thumb: "https://img.youtube.com/vi/2N7uX72o-iM/hqdefault.jpg"
        }
    },
    {
        id: "yt42",
        name: "Dream",
        handle: "@Dream",
        niche: "Gaming",
        country: "United States",
        subscribers: "34M",
        rawSubs: 34000000,
        totalViews: "4.5B",
        rawViews: 4500000000,
        videoCount: 350,
        avatar: "https://unavatar.io/youtube/dream?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=dream",
        banner: "https://yt3.googleusercontent.com/Y8mp82wE43Sl3LzybIYF_Jd703t25h-DGKeJyxU83tAAKAyLe83FORIbJYUpqrU6bTHzlz2GSw=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Minecraft speedrunner and manhunt creator behind some of the platform's most-watched Minecraft content.",
        joinedYear: 2019,
        popularVideo: {
            title: "Minecraft Speedrunner VS 3 Hunters",
            views: "160M+ views",
            thumb: "https://img.youtube.com/vi/3tH4dyOPZnY/hqdefault.jpg"
        }
    },

    // --- ENTERTAINMENT (cont.) ---
    {
        id: "yt43",
        name: "KSI",
        handle: "@KSI",
        niche: "Entertainment",
        country: "United Kingdom",
        subscribers: "24M",
        rawSubs: 24000000,
        totalViews: "6.5B",
        rawViews: 6500000000,
        videoCount: 1000,
        avatar: "https://unavatar.io/youtube/ksi?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=ksi",
        banner: "https://yt3.googleusercontent.com/tD8yZrqy0vhHwqT6VNoIUEGehrz5B1z2pBvXKGpFDuZhPzKIQb2c4hZv-Xaoj6AQR3TrCH4Fsg=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Olajide Olatunji — British gamer, musician, and boxer turned mainstream entertainer and former Sidemen member.",
        joinedYear: 2009,
        popularVideo: {
            title: "KSI vs Logan Paul 2 - Post Fight Reaction",
            views: "25M+ views",
            thumb: "https://img.youtube.com/vi/3j_s6H0_G6M/hqdefault.jpg"
        }
    },
    {
        id: "yt44",
        name: "Sidemen",
        handle: "@Sidemen",
        niche: "Entertainment",
        country: "United Kingdom",
        subscribers: "23M",
        rawSubs: 23000000,
        totalViews: "8B",
        rawViews: 8000000000,
        videoCount: 1500,
        avatar: "https://unavatar.io/youtube/sidemen?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=sidemen",
        banner: "https://yt3.googleusercontent.com/D-gXksmcoGbWcHL45OR1TMAMynVdEyMtv_1g0GulIIYLeNDi__Mf-IMWbd6DK_seTYKqGLL_jwg=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "UK content collective famous for challenge videos, football sketches, and viral group charity events.",
        joinedYear: 2013,
        popularVideo: {
            title: "Sidemen Tinder In Real Life",
            views: "60M+ views",
            thumb: "https://img.youtube.com/vi/tDDEiUX38hc/hqdefault.jpg"
        }
    },

    // --- EDUCATION (cont.) ---
    {
        id: "yt45",
        name: "TED-Ed",
        handle: "@TEDEd",
        niche: "Education",
        country: "United States",
        subscribers: "23M",
        rawSubs: 23000000,
        totalViews: "4.7B",
        rawViews: 4700000000,
        videoCount: 2400,
        avatar: "https://unavatar.io/youtube/teded?fallback=https://ui-avatars.com/api/?background=272727&color=fff&size=128&name=teded",
        banner: "https://yt3.googleusercontent.com/uDIqBXPfz2okcsBe5UsrkTQhY8lsxbi5CRqT_STuWrKHYuS9NZN-BKcYvmXIexmabhtG9y6fBw=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Animated educational lessons on science, history, and big ideas, built around TED's mission to spread knowledge.",
        joinedYear: 2011,
        popularVideo: {
            title: "How playing an instrument benefits your brain",
            views: "20M+ views",
            thumb: "https://img.youtube.com/vi/R0JKCYZ8hng/hqdefault.jpg"
        }
    },
    {
        id: "yt46",
        name: "CrashCourse",
        handle: "@crashcourse",
        niche: "Education",
        country: "United States",
        subscribers: "17M",
        rawSubs: 17000000,
        totalViews: "2.3B",
        rawViews: 2300000000,
        videoCount: 1700,
        avatar: "https://yt3.googleusercontent.com/E454zI2spNFZsN_wgJPTHjMsqs1fFqb_qp4PYanWuyaXQJp98wKEV1kIQYlR57epaweO5P8v=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/cmfLj8atn1YSZw8kjV5fe4uXLDa13Yj2n2OubnIT0pIX7wmQYqa-KXVrLKDKrfBBOwvqGE_y=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Fast-paced, full-course video series from John and Hank Green covering history, science, literature, and more.",
        joinedYear: 2011,
        popularVideo: {
            title: "The Agricultural Revolution: Crash Course World History",
            views: "10M+ views",
            thumb: "https://img.youtube.com/vi/Yocja_N5s1I/hqdefault.jpg"
        }
    },

    // --- TECH & GADGETS (cont.) ---
    {
        id: "yt47",
        name: "iJustine",
        handle: "@ijustine",
        niche: "Tech & Gadgets",
        country: "United States",
        subscribers: "7M",
        rawSubs: 7000000,
        totalViews: "1.5B",
        rawViews: 1500000000,
        videoCount: 3500,
        avatar: "https://yt3.googleusercontent.com/TyFX--bFsY4XVipOdLiWA-NK8X0iwocs9ViPuoSMddCEgwSCrGCPQdRIe5KhEwwmRTvPv6vpnA=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/lRdgbmOprVZoaIY17pYcxX7_eR71DgzbiaLe2_O7Xp2GOoccpNO05KBRIRv9VjSggA7QyiIWl7A=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Justine Ezarik covers Apple product launches, unboxings, and daily-vlog style tech content.",
        joinedYear: 2006,
        popularVideo: {
            title: "Unboxing Every iPhone Ever",
            views: "10M+ views",
            thumb: "https://img.youtube.com/vi/b3p_SjR1-2w/hqdefault.jpg"
        }
    },
    {
        id: "yt48",
        name: "Dave2D",
        handle: "@Dave2D",
        niche: "Tech & Gadgets",
        country: "Canada",
        subscribers: "3.6M",
        rawSubs: 3600000,
        totalViews: "700M",
        rawViews: 700000000,
        videoCount: 1000,
        avatar: "https://yt3.googleusercontent.com/ytc/AIdro_lltZkOAE5XVIlI8U5QVXmdASgYyJiJps-LkO-uQnTwLMQ=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/Jaat_KcALnIx82kvYG8v8hKHw1LWcd1h6l5PiIYYQ32gQbSQ6_Pk78Do9GfDVq5SSczrCK-t=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Dave Lee delivers clean, minimalist laptop and gadget reviews aimed at students and creative professionals.",
        joinedYear: 2013,
        popularVideo: {
            title: "The Best Laptop You Can Buy",
            views: "8M+ views",
            thumb: "https://img.youtube.com/vi/9xG33o6CgS0/hqdefault.jpg"
        }
    },

    // --- LIFESTYLE & VLOG (cont.) ---
    {
        id: "yt49",
        name: "Yes Theory",
        handle: "@YesTheory",
        niche: "Lifestyle & Vlog",
        country: "United States",
        subscribers: "9.7M",
        rawSubs: 9700000,
        totalViews: "1.7B",
        rawViews: 1700000000,
        videoCount: 500,
        avatar: "https://yt3.googleusercontent.com/bdI_oMvgn9Ib9rwv89h89Xd5TcOh2K2DEgzsJdi1dfzXPXLXj2ARFTGzs9oOu_xQLHsCjj2E=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/-p-c5aGIT7s0V-zV57cpNplebEMfq1GQN0Y5S1RkXtn6YJh_fZNjBPmi0yMiez3uh4M75DN1hw=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Seeking Discomfort collective pushing outside their comfort zone through bold social experiments and travel.",
        joinedYear: 2015,
        popularVideo: {
            title: "Asking Strangers to Skydive With Us",
            views: "20M+ views",
            thumb: "https://img.youtube.com/vi/vS3_0L7M-A4/hqdefault.jpg"
        }
    },
    {
        id: "yt50",
        name: "Rosanna Pansino",
        handle: "@rosannapansino",
        niche: "Lifestyle & Vlog",
        country: "United States",
        subscribers: "14M",
        rawSubs: 14000000,
        totalViews: "4.5B",
        rawViews: 4500000000,
        videoCount: 1000,
        avatar: "https://yt3.googleusercontent.com/td6U3EkHE3lUHVc41Jq_uP17JVD0JFBurMA2y1taarmP8wvrH4wckZN8elAdDFEW3ZxFRPWS1Ss=s160-c-k-c0x00ffffff-no-rj",
        banner: "https://yt3.googleusercontent.com/fALDk8YZUzzBRRdWPtCWppqEZCjhRbA-mjPICNdTukd-U2aouXWlDKLXmC5YpjWfVItA-Jk_=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
        bio: "Host of Nerdy Nummies, baking pop-culture-themed treats and lifestyle content for a family-friendly audience.",
        joinedYear: 2010,
        popularVideo: {
            title: "How To Make A Rainbow Cake",
            views: "80M+ views",
            thumb: "https://img.youtube.com/vi/EC77tcJZIdU/hqdefault.jpg"
        }
    }
];

const NICHES_LIST = [
    "All",
    "Gaming",
    "Entertainment",
    "Education",
    "Tech & Gadgets",
    "Lifestyle & Vlog",
    "Music"
];

const CPM_LOW = 0.25;
const CPM_HIGH = 4.0;

const SORT_CONFIG = {
    subs:       { label: "Subscribers",   compare: (a, b) => b.rawSubs - a.rawSubs },
    views:      { label: "Total Views",   compare: (a, b) => b.rawViews - a.rawViews },
    videos:     { label: "Video Count",   compare: (a, b) => b.videoCount - a.videoCount },
    year:       { label: "Joined Year",   compare: (a, b) => a.joinedYear - b.joinedYear },
    earnings:   { label: "Est. Earnings", compare: (a, b) => getEstEarnings(b).yearlyLow - getEstEarnings(a).yearlyLow }
};

let currentNiche = "All";
let currentQuery = "";
let currentSortBy = "subs";
let searchDebounceHandle = null;
let cardObserver = null;

/* ------------------------------------------------------------------
   ANALYTICS HELPERS
------------------------------------------------------------------- */

function getAvgViewsPerVideo(creator) {
    if (!creator.videoCount) return 0;
    return Math.round(creator.rawViews / creator.videoCount);
}

function getChannelAgeMonths(creator) {
    const now = new Date().getFullYear();
    return Math.max(1, (now - creator.joinedYear) * 12);
}

function getUploadsPerWeek(creator) {
    const weeks = getChannelAgeMonths(creator) * 4.345;
    return creator.videoCount / weeks;
}

function getEstEarnings(creator) {
    const monthlyViews = getAvgViewsPerVideo(creator) * getUploadsPerWeek(creator) * 4.345;
    const low = Math.round((monthlyViews / 1000) * CPM_LOW);
    const high = Math.round((monthlyViews / 1000) * CPM_HIGH);
    return {
        monthlyLow: low,
        monthlyHigh: high,
        yearlyLow: low * 12,
        yearlyHigh: high * 12
    };
}

function getSortRank(creator, sortBy) {
    const config = SORT_CONFIG[sortBy] || SORT_CONFIG.subs;
    const sorted = [...YOUTUBERS_DATA].sort(config.compare);
    return sorted.findIndex(c => c.id === creator.id) + 1;
}

function formatCompactNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2).replace(/\.00$/, "") + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(num));
}

function formatCurrency(num) {
    return "$" + formatCompactNumber(num);
}

function buildStatBlocks(creator) {
    const avgViews = getAvgViewsPerVideo(creator);
    const earnings = getEstEarnings(creator);
    const rank = getSortRank(creator, currentSortBy);
    const sortLabel = (SORT_CONFIG[currentSortBy] || SORT_CONFIG.subs).label;

    return [
        { label: "Subscribers", value: creator.subscribers, icon: "👥" },
        { label: "Total Views", value: creator.totalViews, icon: "▶️" },
        { label: "Avg Views/Video", value: formatCompactNumber(avgViews), icon: "📊" },
        { label: "Total Videos", value: creator.videoCount.toLocaleString(), icon: "🎬" },
        { label: "Channel Started", value: String(creator.joinedYear), icon: "📅" },
        { label: "Country", value: creator.country, icon: "🌍" },
        { label: "Category", value: creator.niche, icon: "🏷️" },
        { label: `Rank by ${sortLabel}`, value: "#" + rank + " of " + YOUTUBERS_DATA.length, icon: "📍" },
        { label: "Est. Monthly Earnings", value: `${formatCurrency(earnings.monthlyLow)}–${formatCurrency(earnings.monthlyHigh)}`, icon: "💰" },
        { label: "Est. Yearly Earnings", value: `${formatCurrency(earnings.yearlyLow)}–${formatCurrency(earnings.yearlyHigh)}`, icon: "🪙" }
    ];
}

/* ------------------------------------------------------------------
   UI RENDERING & INTERACTIVITY
------------------------------------------------------------------- */

function renderNicheFilterButtons() {
    const container = document.querySelector(".category-chips");
    if (!container) return;

    container.innerHTML = NICHES_LIST.map(niche => `
        <button class="chip-btn ${niche === currentNiche ? 'active' : ''}" data-niche="${niche}">
            ${niche}
        </button>
    `).join("");

    container.querySelectorAll(".chip-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentNiche = btn.dataset.niche;
            renderNicheFilterButtons();
            renderYoutubers();
        });
    });
}

function handleRealtimeSearch() {
    const searchInput = document.querySelector(".search-bar input");
    const sortSelect = document.querySelector(".sort-container select");

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchDebounceHandle);
            searchDebounceHandle = setTimeout(() => {
                currentQuery = e.target.value.trim().toLowerCase();
                renderYoutubers();
            }, 200);
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            currentSortBy = e.target.value;
            renderYoutubers();
        });
    }
}

function setupScrollReveal() {
    if (cardObserver) cardObserver.disconnect();

    cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("revealed");
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
}

function renderYoutubers() {
    const grid = document.querySelector(".youtuber-list");
    if (!grid) return;

    const sortConfig = SORT_CONFIG[currentSortBy] || SORT_CONFIG.subs;
    const filtered = YOUTUBERS_DATA
        .filter(creator => {
            const matchesNiche = currentNiche === "All" || creator.niche === currentNiche;
            const matchesQuery = !currentQuery || 
                creator.name.toLowerCase().includes(currentQuery) || 
                creator.handle.toLowerCase().includes(currentQuery) ||
                creator.niche.toLowerCase().includes(currentQuery);
            return matchesNiche && matchesQuery;
        })
        .sort(sortConfig.compare);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No creators found</h3>
                <p>Try adjusting your search terms or selecting a different category.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(creator => {
        const rank = getSortRank(creator, currentSortBy);
        return `
            <div class="youtuber-card" tabIndex="0" data-id="${creator.id}">
                <div class="banner-container">
                    <img class="channel-banner" src="${creator.banner}" alt="${creator.name} Banner" loading="lazy" />
                    <div class="avatar-wrapper">
                        <img class="creator-avatar" src="${creator.avatar}" alt="${creator.name} Avatar" loading="lazy" />
                    </div>
                    <span class="rank-badge">#${rank}</span>
                </div>
                <div class="card-body">
                    <h3>${creator.name} <span class="verified-badge">✓</span></h3>
                    <div class="handle">${creator.handle}</div>
                    <div class="sub-count">${creator.subscribers} subscribers</div>
                    <span class="niche-badge">${creator.niche}</span>
                    <p class="bio">${creator.bio}</p>
                </div>
            </div>
        `;
    }).join("");

    grid.querySelectorAll(".youtuber-card").forEach(card => {
        if (cardObserver) cardObserver.observe(card);
        card.addEventListener("click", () => {
            const creator = YOUTUBERS_DATA.find(c => c.id === card.dataset.id);
            if (creator) openModal(creator);
        });
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const creator = YOUTUBERS_DATA.find(c => c.id === card.dataset.id);
                if (creator) openModal(creator);
            }
        });
    });
}

function openModal(creator) {
    let overlay = document.querySelector(".modal-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        document.body.appendChild(overlay);
    }

    const statBlocks = buildStatBlocks(creator);

    overlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-btn" aria-label="Close modal">&times;</button>
            <img class="modal-banner" src="${creator.banner}" alt="${creator.name} Banner" />
            <div class="modal-header-info">
                <div class="modal-identity">
                    <div class="modal-avatar-wrapper">
                        <img class="modal-avatar" src="${creator.avatar}" alt="${creator.name}" />
                    </div>
                    <div class="modal-name-block">
                        <h2 style="margin: 0; font-size: 1.4rem;">${creator.name}</h2>
                        <div class="handle">${creator.handle}</div>
                    </div>
                </div>
                <button class="subscribe-btn">Subscribe</button>
            </div>
            <div class="modal-body">
                <h4 class="section-label">Channel Overview</h4>
                <div class="stats-grid">
                    ${statBlocks.map((s, idx) => `
                        <div class="stat-item stat-anim" style="animation-delay: ${idx * 0.04}s;">
                            <span>${s.icon}${s.label}</span>
                            <strong>${s.value}</strong>
                        </div>
                    `).join("")}
                </div>
                
                <h4 class="section-label">Most Popular Upload</h4>
                <div class="popular-upload">
                    <img src="${creator.popularVideo.thumb}" alt="${creator.popularVideo.title}" />
                    <div>
                        <strong style="color: #fff; font-size: 0.95rem; display: block;">${creator.popularVideo.title}</strong>
                        <span style="color: #aaa; font-size: 0.85rem;">${creator.popularVideo.views}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    overlay.classList.add("show");

    const closeBtn = overlay.querySelector(".modal-close-btn");
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });
}

function closeModal() {
    const overlay = document.querySelector(".modal-overlay");
    if (overlay) overlay.classList.remove("show");
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});

/* ------------------------------------------------------------------
   INIT
------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    setupScrollReveal();
    renderNicheFilterButtons();
    handleRealtimeSearch();
    renderYoutubers();
});