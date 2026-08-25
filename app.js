const YOUTUBERS_DATA = [
    // --- GAMING ---
    {
        id: "yt1",
        name: "PewDiePie",
        handle: "@pewdiepie",
        niche: "Gaming",
        subscribers: "111M",
        rawSubs: 111000000,
        totalViews: "29.3B",
        rawViews: 29300000000,
        videoCount: 4750,
        avatar: "https://picsum.photos/seed/pewdiepie_avatar/120/120",
        banner: "https://picsum.photos/seed/pewdiepie_banner/800/200",
        bio: "Swedish creator known for gaming playthroughs, meme reviews, and legendary vlogs in Japan.",
        joinedYear: 2010,
        popularVideo: {
            title: "bitch lasagne",
            views: "320M views",
            thumb: "https://picsum.photos/seed/pewdiepie_vid/320/180"
        }
    },
    {
        id: "yt2",
        name: "Markiplier",
        handle: "@markiplier",
        niche: "Gaming",
        subscribers: "36.8M",
        rawSubs: 36800000,
        totalViews: "21.1B",
        rawViews: 21100000000,
        videoCount: 5600,
        avatar: "https://picsum.photos/seed/markiplier_avatar/120/120",
        banner: "https://picsum.photos/seed/markiplier_banner/800/200",
        bio: "Let's Plays, indie horror games, comedy sketches, and high-budget interactive original series.",
        joinedYear: 2012,
        popularVideo: {
            title: "FIVE NIGHTS AT FREDDY'S - Part 1",
            views: "112M views",
            thumb: "https://picsum.photos/seed/markiplier_vid/320/180"
        }
    },
    {
        id: "yt3",
        name: "Jacksepticeye",
        handle: "@jacksepticeye",
        niche: "Gaming",
        subscribers: "30.9M",
        rawSubs: 30900000,
        totalViews: "16.8B",
        rawViews: 16800000000,
        videoCount: 5100,
        avatar: "https://picsum.photos/seed/jack_avatar/120/120",
        banner: "https://picsum.photos/seed/jack_banner/800/200",
        bio: "Top-energy Irish gamer bringing high enthusiasm, funny reactions, and indie game play-throughs.",
        joinedYear: 2007,
        popularVideo: {
            title: "ALL THE WAY - Jacksepticeye Songify Remix",
            views: "105M views",
            thumb: "https://picsum.photos/seed/jack_vid/320/180"
        }
    },
    {
        id: "yt4",
        name: "RTGame",
        handle: "@rtgame",
        niche: "Gaming",
        subscribers: "2.8M",
        rawSubs: 2800000,
        totalViews: "1.2B",
        rawViews: 1200000000,
        videoCount: 1850,
        avatar: "https://picsum.photos/seed/rtgame_avatar/120/120",
        banner: "https://picsum.photos/seed/rtgame_banner/800/200",
        bio: "Irish creator causing hilarious chaos in building games, simulators, and multiplayer streams.",
        joinedYear: 2011,
        popularVideo: {
            title: "I forced 200 players to build a city in Minecraft",
            views: "14M views",
            thumb: "https://picsum.photos/seed/rtgame_vid/320/180"
        }
    },

    // --- ENTERTAINMENT ---
    {
        id: "yt5",
        name: "MrBeast",
        handle: "@mrbeast",
        niche: "Entertainment",
        subscribers: "310M",
        rawSubs: 310000000,
        totalViews: "58.5B",
        rawViews: 58500000000,
        videoCount: 810,
        avatar: "https://picsum.photos/seed/mrbeast_avatar/120/120",
        banner: "https://picsum.photos/seed/mrbeast_banner/800/200",
        bio: "Massive stunt challenges, philanthropy giveaways, and record-breaking YouTube spectacles.",
        joinedYear: 2012,
        popularVideo: {
            title: "$456,000 Squid Game In Real Life!",
            views: "640M views",
            thumb: "https://picsum.photos/seed/mrbeast_vid/320/180"
        }
    },
    {
        id: "yt6",
        name: "Dude Perfect",
        handle: "@dudeperfect",
        niche: "Entertainment",
        subscribers: "60.4M",
        rawSubs: 60400000,
        totalViews: "17.2B",
        rawViews: 17200000000,
        videoCount: 420,
        avatar: "https://picsum.photos/seed/dp_avatar/120/120",
        banner: "https://picsum.photos/seed/dp_banner/800/200",
        bio: "5 guys pushing the limits of trick shots, sports comedy, and absurd physical challenges.",
        joinedYear: 2009,
        popularVideo: {
            title: "Water Bottle Flip 2 | Dude Perfect",
            views: "440M views",
            thumb: "https://picsum.photos/seed/dp_vid/320/180"
        }
    },
    {
        id: "yt7",
        name: "Ryan Trahan",
        handle: "@ryantrahan",
        niche: "Entertainment",
        subscribers: "16.2M",
        rawSubs: 16200000,
        totalViews: "3.4B",
        rawViews: 3400000000,
        videoCount: 620,
        avatar: "https://picsum.photos/seed/trahan_avatar/120/120",
        banner: "https://picsum.photos/seed/trahan_banner/800/200",
        bio: "Challenge creator famous for penny cross-country trips, testing bizarre products, and fundraising.",
        joinedYear: 2013,
        popularVideo: {
            title: "I Survived On $0.01 For 30 Days",
            views: "38M views",
            thumb: "https://picsum.photos/seed/trahan_vid/320/180"
        }
    },
    {
        id: "yt8",
        name: "Michelle Khare",
        handle: "@michellekhare",
        niche: "Entertainment",
        subscribers: "4.8M",
        rawSubs: 4800000,
        totalViews: "620M",
        rawViews: 62000000,
        videoCount: 290,
        avatar: "https://picsum.photos/seed/khare_avatar/120/120",
        banner: "https://picsum.photos/seed/khare_banner/800/200",
        bio: "Host of 'Challenge Accepted', training alongside elite firefighters, FBI agents, and stunt performers.",
        joinedYear: 2016,
        popularVideo: {
            title: "I Tried FBI Hostage Rescue Training",
            views: "18M views",
            thumb: "https://picsum.photos/seed/khare_vid/320/180"
        }
    },

    // --- EDUCATION ---
    {
        id: "yt9",
        name: "Veritasium",
        handle: "@veritasium",
        niche: "Education",
        subscribers: "15.9M",
        rawSubs: 15900000,
        totalViews: "2.8B",
        rawViews: 2800000000,
        videoCount: 390,
        avatar: "https://picsum.photos/seed/veritasium_avatar/120/120",
        banner: "https://picsum.photos/seed/veritasium_banner/800/200",
        bio: "An element of truth - deep science videos, mind-bending physics experiments, and counterintuitive math.",
        joinedYear: 2010,
        popularVideo: {
            title: "The Bizarre Behavior of Rotating Bodies",
            views: "62M views",
            thumb: "https://picsum.photos/seed/veritasium_vid/320/180"
        }
    },
    {
        id: "yt10",
        name: "Mark Rober",
        handle: "@markrober",
        niche: "Education",
        subscribers: "55.2M",
        rawSubs: 55200000,
        totalViews: "6.1B",
        rawViews: 6100000000,
        videoCount: 140,
        avatar: "https://picsum.photos/seed/rober_avatar/120/120",
        banner: "https://picsum.photos/seed/rober_banner/800/200",
        bio: "Ex-NASA engineer building glitterbombs, giant maze tests for squirrels, and science education setups.",
        joinedYear: 2011,
        popularVideo: {
            title: "Glitterbomb 5.0 vs Porch Pirates",
            views: "125M views",
            thumb: "https://picsum.photos/seed/rober_vid/320/180"
        }
    },
    {
        id: "yt11",
        name: "Kurzgesagt – In a Nutshell",
        handle: "@kurzgesagt",
        niche: "Education",
        subscribers: "22.4M",
        rawSubs: 22400000,
        totalViews: "2.7B",
        rawViews: 2700000000,
        videoCount: 210,
        avatar: "https://picsum.photos/seed/kurz_avatar/120/120",
        banner: "https://picsum.photos/seed/kurz_banner/800/200",
        bio: "Animated videos explaining space, humanity, biology, existential risks, and optimistic nihilism.",
        joinedYear: 2013,
        popularVideo: {
            title: "The Egg - A Short Story",
            views: "35M views",
            thumb: "https://picsum.photos/seed/kurz_vid/320/180"
        }
    },
    {
        id: "yt12",
        name: "Steve Mould",
        handle: "@stevemould",
        niche: "Education",
        subscribers: "1.9M",
        rawSubs: 1900000,
        totalViews: "310M",
        rawViews: 310000000,
        videoCount: 280,
        avatar: "https://picsum.photos/seed/mould_avatar/120/120",
        banner: "https://picsum.photos/seed/mould_banner/800/200",
        bio: "Science presenter explaining odd physical phenomena, fluid dynamics, and clever mechanical devices.",
        joinedYear: 2006,
        popularVideo: {
            title: "The Chain Fountain Phenomenon Explained",
            views: "12M views",
            thumb: "https://picsum.photos/seed/mould_vid/320/180"
        }
    },

    // --- TECH & GADGETS ---
    {
        id: "yt13",
        name: "Marques Brownlee (MKBHD)",
        handle: "@mkbhd",
        niche: "Tech & Gadgets",
        subscribers: "18.8M",
        rawSubs: 18800000,
        totalViews: "4.2B",
        rawViews: 4200000000,
        videoCount: 1650,
        avatar: "https://picsum.photos/seed/mkbhd_avatar/120/120",
        banner: "https://picsum.photos/seed/mkbhd_banner/800/200",
        bio: "Quality tech videos, smartphone reviews, EV breakdowns, and crisp studio production.",
        joinedYear: 2008,
        popularVideo: {
            title: "Apple Vision Pro Review: Tomorrow's Tech Today!",
            views: "24M views",
            thumb: "https://picsum.photos/seed/mkbhd_vid/320/180"
        }
    },
    {
        id: "yt14",
        name: "Linus Tech Tips",
        handle: "@linustechtips",
        niche: "Tech & Gadgets",
        subscribers: "15.7M",
        rawSubs: 15700000,
        totalViews: "7.8B",
        rawViews: 7800000000,
        videoCount: 6400,
        avatar: "https://picsum.photos/seed/ltt_avatar/120/120",
        banner: "https://picsum.photos/seed/ltt_banner/800/200",
        bio: "PC building, server hardware setups, consumer technology tests, and funny workshop experiments.",
        joinedYear: 2008,
        popularVideo: {
            title: "Building a PC... in a Desk!",
            views: "28M views",
            thumb: "https://picsum.photos/seed/ltt_vid/320/180"
        }
    },
    {
        id: "yt15",
        name: "Mrwhosetheboss",
        handle: "@mrwhosetheboss",
        niche: "Tech & Gadgets",
        subscribers: "19.1M",
        rawSubs: 19100000,
        totalViews: "4.9B",
        rawViews: 4900000000,
        videoCount: 1800,
        avatar: "https://picsum.photos/seed/boss_avatar/120/120",
        banner: "https://picsum.photos/seed/boss_banner/800/200",
        bio: "Arun Maini reviews wild smartphones, future gadgets, camera showdowns, and luxury tech.",
        joinedYear: 2011,
        popularVideo: {
            title: "I Bought the World's Most Expensive Tech!",
            views: "42M views",
            thumb: "https://picsum.photos/seed/boss_vid/320/180"
        }
    },
    {
        id: "yt16",
        name: "The Verge",
        handle: "@theverge",
        niche: "Tech & Gadgets",
        subscribers: "3.4M",
        rawSubs: 3400000,
        totalViews: "1.4B",
        rawViews: 1400000000,
        videoCount: 4200,
        avatar: "https://picsum.photos/seed/verge_avatar/120/120",
        banner: "https://picsum.photos/seed/verge_banner/800/200",
        bio: "Covering the intersection of technology, science, art, and culture with deep reviews.",
        joinedYear: 2011,
        popularVideo: {
            title: "Humane AI Pin Review: Not Quite Ready",
            views: "8.5M views",
            thumb: "https://picsum.photos/seed/verge_vid/320/180"
        }
    },

    // --- LIFESTYLE & VLOG ---
    {
        id: "yt17",
        name: "Casey Neistat",
        handle: "@caseyneistat",
        niche: "Lifestyle & Vlog",
        subscribers: "12.6M",
        rawSubs: 12600000,
        totalViews: "3.2B",
        rawViews: 3200000000,
        videoCount: 1120,
        avatar: "https://picsum.photos/seed/casey_avatar/120/120",
        banner: "https://picsum.photos/seed/casey_banner/800/200",
        bio: "Filmmaker based in NYC known for pioneering modern daily vlogging, filmmaking tips, and gear tests.",
        joinedYear: 2010,
        popularVideo: {
            title: "THE $21,000 FIRST CLASS AIRPLANE SEAT",
            views: "82M views",
            thumb: "https://picsum.photos/seed/casey_vid/320/180"
        }
    },
    {
        id: "yt18",
        name: "Emma Chamberlain",
        handle: "@emmachamberlain",
        niche: "Lifestyle & Vlog",
        subscribers: "12.0M",
        rawSubs: 12000000,
        totalViews: "1.6B",
        rawViews: 1600000000,
        videoCount: 380,
        avatar: "https://picsum.photos/seed/emma_avatar/120/120",
        banner: "https://picsum.photos/seed/emma_banner/800/200",
        bio: "Unfiltered lifestyle vlogs, fashion breakdowns, coffee culture, and candid personal thoughts.",
        joinedYear: 2016,
        popularVideo: {
            title: "ROAD TRIP TO LA ALONE",
            views: "18M views",
            thumb: "https://picsum.photos/seed/emma_vid/320/180"
        }
    },
    {
        id: "yt19",
        name: "Matt D'Avella",
        handle: "@mattdavella",
        niche: "Lifestyle & Vlog",
        subscribers: "3.7M",
        rawSubs: 3700000,
        totalViews: "380M",
        rawViews: 380000000,
        videoCount: 310,
        avatar: "https://picsum.photos/seed/matt_avatar/120/120",
        banner: "https://picsum.photos/seed/matt_banner/800/200",
        bio: "Filmmaker and minimalist exploring self-improvement, productivity habits, and intentional living.",
        joinedYear: 2011,
        popularVideo: {
            title: "I quit sugar for 30 days",
            views: "15M views",
            thumb: "https://picsum.photos/seed/matt_vid/320/180"
        }
    },
    {
        id: "yt20",
        name: "Nate O'Brien",
        handle: "@nateobrien",
        niche: "Lifestyle & Vlog",
        subscribers: "1.3M",
        rawSubs: 1300000,
        totalViews: "95M",
        rawViews: 95000000,
        videoCount: 240,
        avatar: "https://picsum.photos/seed/nate_avatar/120/120",
        banner: "https://picsum.photos/seed/nate_banner/800/200",
        bio: "Personal finance vlogs, productivity routines, minimal living, and smart money habits for young adults.",
        joinedYear: 2016,
        popularVideo: {
            title: "How To Manage Your Money Like The 1%",
            views: "4.5M views",
            thumb: "https://picsum.photos/seed/nate_vid/320/180"
        }
    }
];

const NICHES_LIST = [
    "All", 
    "Gaming", 
    "Entertainment", 
    "Education", 
    "Tech & Gadgets", 
    "Lifestyle & Vlog"
];

let currentNiche = "All";

document.addEventListener("DOMContentLoaded", () => {
    renderNicheFilterButtons();
    handleRealtimeSearch();
});

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]));
}

function renderNicheFilterButtons() {
    const container = document.getElementById("categoryContainer");
    if (!container) return;
    
    container.innerHTML = NICHES_LIST.map(niche => `
        <button class="chip-btn ${niche === currentNiche ? 'active' : ''}" 
                onclick="filterNiche('${niche}')">
            ${niche}
        </button>
    `).join("");
}

function filterNiche(niche) {
    currentNiche = niche;
    renderNicheFilterButtons();
    handleRealtimeSearch();
}

function handleRealtimeSearch() {
    const searchInput = document.getElementById("searchInput");
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    
    let filtered = YOUTUBERS_DATA.filter(creator => {
        const matchesNiche = currentNiche === "All" || creator.niche === currentNiche;
        const matchesSearch = creator.name.toLowerCase().includes(query) || 
                              creator.handle.toLowerCase().includes(query) ||
                              creator.bio.toLowerCase().includes(query);
        return matchesNiche && matchesSearch;
    });

    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) {
        const sortBy = sortSelect.value;
        if (sortBy === "subs") {
            filtered.sort((a, b) => b.rawSubs - a.rawSubs);
        } else if (sortBy === "views") {
            filtered.sort((a, b) => b.rawViews - a.rawViews);
        } else if (sortBy === "videos") {
            filtered.sort((a, b) => b.videoCount - a.videoCount);
        }
    }

    updateSearchBanner(query, filtered.length);
    displayYoutubers(filtered);
}

function updateSearchBanner(query, count) {
    const banner = document.getElementById("searchBanner");
    if (!banner) return;
    
    if (query || currentNiche !== "All") {
        banner.style.display = "block";
        banner.innerHTML = `Results for <strong>"${escapeHTML(query || currentNiche)}"</strong>: <span>${count} creators found</span>`;
    } else {
        banner.style.display = "none";
    }
}

function displayYoutubers(creators) {
    const list = document.getElementById("youtuberList");
    if (!list) return;
    
    if (creators.length === 0) {
        list.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #aaa; padding: 40px 0;">No creators found.</p>`;
        return;
    }

    list.innerHTML = creators.map(creator => `
        <div class="youtuber-card" tabindex="0" onclick="viewCreator('${creator.id}')" onkeydown="if(event.key==='Enter') viewCreator('${creator.id}')">
            <div class="banner-container">
                <img class="channel-banner" src="${creator.banner}" alt="Banner">
                <div class="avatar-wrapper">
                    <img class="creator-avatar" src="${creator.avatar}" alt="${escapeHTML(creator.name)}">
                </div>
            </div>
            <div class="card-body">
                <h3>${escapeHTML(creator.name)}</h3>
                <div class="handle">${escapeHTML(creator.handle)}</div>
                <div class="sub-count">${creator.subscribers} subscribers</div>
                <span class="niche-badge">${creator.niche}</span>
                <p class="bio">${escapeHTML(creator.bio)}</p>
            </div>
        </div>
    `).join("");
}

function sortAndDisplayYoutubers() {
    handleRealtimeSearch();
}

function viewCreator(id) {
    const creator = YOUTUBERS_DATA.find(c => c.id === id);
    if (!creator) return;

    const modal = document.getElementById("creatorModal");
    if (!modal) return;

    document.getElementById("modalBanner").src = creator.banner;
    document.getElementById("modalAvatar").src = creator.avatar;
    document.getElementById("modalName").innerText = creator.name;
    document.getElementById("modalHandle").innerText = creator.handle;
    document.getElementById("modalSubs").innerText = creator.subscribers;
    document.getElementById("modalViews").innerText = creator.totalViews;
    document.getElementById("modalVideoCount").innerText = creator.videoCount;
    document.getElementById("modalBio").innerText = creator.bio;
    
    document.getElementById("modalUploadThumb").src = creator.popularVideo.thumb;
    document.getElementById("modalUploadTitle").innerText = creator.popularVideo.title;
    document.getElementById("modalUploadViews").innerText = creator.popularVideo.views;

    modal.classList.add("show");
}

function closeModal() {
    const modal = document.getElementById("creatorModal");
    if (modal) modal.classList.remove("show");
}
