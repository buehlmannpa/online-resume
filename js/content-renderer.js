(() => {
  "use strict";

  const content = window.resumeContent;
  if (!content) {
    return;
  }

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const significantCompanyWords = (companyName) => {
    const stopWords = new Set([
      "the", "and", "of", "for", "die", "der", "das", "und", "ag", "sa", "inc", "llc", "ltd", "gmbh", "corp"
    ]);

    return String(companyName)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word && !stopWords.has(word));
  };

  const domainCandidatesFromCompany = (companyName) => {
    const words = significantCompanyWords(companyName);
    const joined = words.join("");
    const hyphenated = words.join("-");
    const tlds = [".com", ".ch", ".io", ".net"];
    const domains = new Set();

    const addDomainVariants = (base) => {
      if (!base) {
        return;
      }
      tlds.forEach((tld) => domains.add(`${base}${tld}`));
    };

    addDomainVariants(joined);
    addDomainVariants(hyphenated);
    if (words.length > 1) {
      addDomainVariants(`${words[0]}${words[words.length - 1]}`);
      addDomainVariants(words[words.length - 1]);
    }
    if (words.includes("swiss") && words.includes("post")) {
      domains.add("post.ch");
    }
    if (words.includes("schweizerische") && words.includes("post")) {
      domains.add("post.ch");
    }

    return Array.from(domains);
  };

  const initCompanyLogos = (rootElement) => {
    rootElement.querySelectorAll(".timeline-company-logo").forEach((logoEl) => {
      const companyName = logoEl.dataset.company || "";
      const explicitDomain = (logoEl.dataset.domain || "").trim();
      const candidates = explicitDomain
        ? [explicitDomain, ...domainCandidatesFromCompany(companyName)]
        : domainCandidatesFromCompany(companyName);

      const uniqueCandidates = Array.from(new Set(candidates));
      let index = 0;
      let providerIndex = 0;
      const providerUrls = [
        (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`
      ];

      const loadNext = () => {
        if (index >= uniqueCandidates.length) {
          logoEl.classList.add("is-fallback");
          logoEl.alt = "";
          return;
        }

        const domain = uniqueCandidates[index];
        logoEl.src = providerUrls[providerIndex](domain);
      };

      logoEl.onerror = () => {
        providerIndex += 1;
        if (providerIndex >= providerUrls.length) {
          providerIndex = 0;
          index += 1;
        }
        loadNext();
      };

      loadNext();
    });
  };

  const aboutEl = document.getElementById("about-content");
  if (aboutEl && content.about) {
    const focusPrefix = content.about.focusPrefix || "Currently focused on";
    const focusAreas = Array.isArray(content.about.focusAreas) && content.about.focusAreas.length
      ? content.about.focusAreas
      : ["Platform Engineering"];

    const socialHtml = (content.about.socials || [])
      .map(
        (social) => `
        <li class="list-inline-item">
          <a href="${escapeHtml(social.url)}" aria-label="${escapeHtml(social.name)}">
            <span class="fa-stack fa-lg">
              <i class="fa fa-circle fa-stack-2x"></i>
              <i class="fa ${escapeHtml(social.icon)} fa-stack-1x fa-inverse"></i>
            </span>
          </a>
        </li>`
      )
      .join("");

    aboutEl.innerHTML = `
      <h1 class="mb-0">${escapeHtml(content.about.lastName)}
        <span class="text-primary">${escapeHtml(content.about.firstName)}</span>
      </h1>
      <div class="subheading mb-5">
        ${escapeHtml(content.about.country)} &middot;
        <a href="mailto:${escapeHtml(content.about.email)}">${escapeHtml(content.about.email)}</a>
        <button id="copy-email-btn" class="btn btn-link btn-sm p-0 ms-2" type="button">Copy email</button>
      </div>
      <p class="lead mb-4">${escapeHtml(focusPrefix)} <span id="role-rotator" class="role-rotator">${escapeHtml(focusAreas[0])}</span>.</p>
      <p class="mb-5">${escapeHtml(content.about.summary)}</p>
      <ul class="list-inline list-social-icons mb-0">
        ${socialHtml}
      </ul>`;
  }

  const experienceEl = document.getElementById("experience-content");
  if (experienceEl && Array.isArray(content.experience)) {
    const items = content.experience
      .map(
        (job) => `
        <article class="timeline-item">
          <div class="timeline-meta">
            <p class="timeline-date">${escapeHtml(job.dateRange)}</p>
            <p class="timeline-role">${escapeHtml(job.title)}</p>
          </div>
          <div class="timeline-marker" aria-hidden="true">
            <span class="timeline-dot"></span>
          </div>
          <div class="timeline-body">
            <h3 class="timeline-heading timeline-company">
              <img class="timeline-company-logo" src="" alt="" loading="lazy" referrerpolicy="no-referrer" data-company="${escapeHtml(job.company)}" data-domain="${escapeHtml(job.companyDomain || "")}">
              <span>${escapeHtml(job.company)}</span>
            </h3>
            <ul class="timeline-bullets">
              ${(job.bullets || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
            </ul>
          </div>
        </article>`
      )
      .join("");

    experienceEl.innerHTML = `
      <h2 class="mb-5">Experience</h2>
      <div class="timeline-list">
        ${items}
      </div>`;
    initCompanyLogos(experienceEl);
  }

  const educationEl = document.getElementById("education-content");
  if (educationEl && Array.isArray(content.education)) {
    const items = content.education
      .map(
        (entry) => `
        <article class="timeline-item">
          <div class="timeline-meta">
            <p class="timeline-date">${escapeHtml(entry.dateRange)}</p>
            <p class="timeline-role">${escapeHtml(entry.subtitle)}</p>
          </div>
          <div class="timeline-marker" aria-hidden="true">
            <span class="timeline-dot"></span>
          </div>
          <div class="timeline-body">
            <h3 class="timeline-heading">${escapeHtml(entry.school)}</h3>
            <p class="timeline-copy mb-2">${escapeHtml(entry.description)}</p>
            <p class="timeline-extra">&#9656; ${escapeHtml(entry.extra)}</p>
          </div>
        </article>`
      )
      .join("");

    educationEl.innerHTML = `
      <h2 class="mb-5">Education</h2>
      <div class="timeline-list">
        ${items}
      </div>`;
  }

  const skillsEl = document.getElementById("skills-content");
  if (skillsEl && content.skills) {
    const tools = (content.skills.tools || [])
      .map((iconClass) => `<li class="list-inline-item"><i class="${escapeHtml(iconClass)}"></i></li>`)
      .join("");

    const workflow = (content.skills.workflow || [])
      .map((item) => `<li><i class="fa-li fa fa-check"></i>${escapeHtml(item)}</li>`)
      .join("");

    skillsEl.innerHTML = `
      <h2 class="mb-5">Skills</h2>
      <div class="subheading mb-3">Programming Languages &amp; Tools</div>
      <ul class="list-inline list-icons">${tools}</ul>
      <div class="subheading mb-3">Workflow</div>
      <ul class="fa-ul mb-0">${workflow}</ul>`;
  }

  const interestsEl = document.getElementById("interests-content");
  if (interestsEl && content.interests) {
    if (Array.isArray(content.interests)) {
      const paragraphs = content.interests
        .map((text, index) => `<p class="${index === content.interests.length - 1 ? "mb-0" : ""}">${escapeHtml(text)}</p>`)
        .join("");

      interestsEl.innerHTML = `
        <h2 class="mb-5">Interests</h2>
        ${paragraphs}`;
    } else {
      const buckets = Array.isArray(content.interests.buckets) ? content.interests.buckets : [];
      const photos = Array.isArray(content.interests.photos) ? content.interests.photos : [];

      const rowCount = Math.max(buckets.length, photos.length);
      const interestRows = Array.from({ length: rowCount }, (_, index) => {
        const entry = buckets[index];
        const photo = photos[index];

        const cardHtml = entry
          ? `
          <article class="interest-card">
            <p class="interest-label">${escapeHtml(entry.label || "")}</p>
            <h3 class="interest-title">${escapeHtml(entry.title || "")}</h3>
            <p class="interest-why">${escapeHtml(entry.why || "")}</p>
          </article>`
          : "";

        const photoHtml = photo
          ? `
          <figure class="interest-photo-card">
            <img src="${escapeHtml(photo.src || "")}" alt="${escapeHtml(photo.alt || "Interest image")}" loading="lazy">
          </figure>`
          : "";

        return `
          <div class="interest-row">
            ${cardHtml}
            ${photoHtml}
          </div>`;
      }).join("");

      interestsEl.innerHTML = `
        <h2 class="mb-5">Interests</h2>
        <div class="interest-layout">
          ${interestRows}
        </div>`;
    }
  }

  const awardsEl = document.getElementById("awards-content");
  if (awardsEl && Array.isArray(content.awards)) {
    const items = content.awards
      .map((award) => `<li><i class="fa-li fa fa-trophy text-warning"></i>${escapeHtml(award)}</li>`)
      .join("");

    awardsEl.innerHTML = `
      <h2 class="mb-5">Awards &amp; Certifications</h2>
      <ul class="fa-ul mb-0">${items}</ul>`;
  }
})();
