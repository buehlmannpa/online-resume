(() => {
  "use strict";

  const downloadButton = document.getElementById("download-cv-btn");
  if (!downloadButton) {
    return;
  }

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const asArray = (value) => (Array.isArray(value) ? value : []);

  const isCrossOriginUrl = (urlValue) => {
    if (!urlValue) {
      return false;
    }
    try {
      const url = new URL(urlValue, window.location.href);
      return url.origin !== window.location.origin;
    } catch (_error) {
      return false;
    }
  };

  const waitForImage = (img) =>
    new Promise((resolve) => {
      if (!img) {
        resolve();
        return;
      }
      if (img.complete) {
        resolve();
        return;
      }
      const onDone = () => {
        img.removeEventListener("load", onDone);
        img.removeEventListener("error", onDone);
        resolve();
      };
      img.addEventListener("load", onDone, { once: true });
      img.addEventListener("error", onDone, { once: true });
      window.setTimeout(onDone, 2500);
    });

  const waitForImages = async (root) => {
    const images = Array.from(root.querySelectorAll("img"));
    await Promise.all(images.map((img) => waitForImage(img)));
  };

  const createIsolatedExportFrame = (markup) =>
    new Promise((resolve, reject) => {
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      frame.style.position = "fixed";
      frame.style.left = "-10000px";
      frame.style.top = "0";
      frame.style.width = "210mm";
      frame.style.height = "297mm";
      frame.style.border = "0";
      frame.style.opacity = "0";
      frame.style.pointerEvents = "none";

      const baseHref = escapeHtml(new URL(".", window.location.href).href);
      frame.srcdoc = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <base href="${baseHref}">
    <link rel="stylesheet" href="css/enhancements.css">
    <style>
      html, body { margin: 0; padding: 0; background: #fff; }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body>
    ${markup}
  </body>
</html>`;

      const cleanupAndReject = (message) => {
        frame.remove();
        reject(new Error(message));
      };

      frame.addEventListener(
        "load",
        () => {
          const doc = frame.contentDocument;
          if (!doc) {
            cleanupAndReject("Unable to access PDF frame document.");
            return;
          }
          const element = doc.querySelector(".pdf-cv");
          if (!element) {
            cleanupAndReject("Unable to find PDF root element.");
            return;
          }
          resolve({ frame, element, doc });
        },
        { once: true }
      );

      document.body.appendChild(frame);
    });

  function buildContactRows(about) {
    const rows = [];

    if (about.addressLine) {
      rows.push({ icon: "A", value: about.addressLine });
    }
    if (about.phone) {
      rows.push({ icon: "P", value: about.phone });
    }
    if (about.email) {
      rows.push({ icon: "E", value: about.email });
    }
    if (about.website) {
      rows.push({ icon: "W", value: about.website });
    }

    return rows
      .map(
        (row) => `
          <p class="pdf-contact-row">
            <span class="pdf-contact-icon" aria-hidden="true">${escapeHtml(row.icon)}</span>
            <span>${escapeHtml(row.value)}</span>
          </p>`
      )
      .join("");
  }

  function buildPdfMarkup(content) {
    const about = content.about || {};
    const skills = content.skills || {};
    const interests = content.interests || {};
    const experience = asArray(content.experience);
    const education = asArray(content.education);
    const awards = asArray(content.awards);

    const firstExperience = experience[0] || {};
    const profileTitle = about.profileTitle || firstExperience.title || "";

    const skillsChips = asArray(skills.workflow)
      .map((item) => `<span class="pdf-chip">${escapeHtml(item)}</span>`)
      .join("");

    const experienceItems = experience
      .map(
        (item) => `
          <article class="pdf-item">
            <div class="pdf-item-top">
              <div>
                <h3 class="pdf-item-title">${escapeHtml(item.title || "")}</h3>
                <p class="pdf-item-sub">${escapeHtml(item.company || "")}</p>
              </div>
              <div class="pdf-item-date">${escapeHtml(item.dateRange || "")}</div>
            </div>
            <ul class="pdf-list">
              ${asArray(item.bullets).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
            </ul>
          </article>`
      )
      .join("");

    const educationItems = education
      .map(
        (item) => `
          <article class="pdf-item">
            <div class="pdf-item-top">
              <div>
                <h3 class="pdf-item-title">${escapeHtml(item.school || "")}</h3>
                <p class="pdf-item-sub">${escapeHtml(item.subtitle || "")}</p>
              </div>
              <div class="pdf-item-date">${escapeHtml(item.dateRange || "")}</div>
            </div>
            <p class="pdf-summary">${escapeHtml(item.description || "")}</p>
            <p class="pdf-edu-extra">${escapeHtml(item.extra || "")}</p>
          </article>`
      )
      .join("");

    const interestsItems = Array.isArray(interests.buckets)
      ? interests.buckets
          .map(
            (entry) => `
              <article class="pdf-interest-card">
                <p class="pdf-interest-label">${escapeHtml(entry.label || "")}</p>
                <p class="pdf-interest-title">${escapeHtml(entry.title || "")}</p>
                <p class="pdf-interest-text">${escapeHtml(entry.why || "")}</p>
              </article>`
          )
          .join("")
      : asArray(interests).map((line) => `<p class="pdf-interest-text">${escapeHtml(line)}</p>`).join("");

    const awardsItems = awards.map((award) => `<li>${escapeHtml(award)}</li>`).join("");

    return `
      <article class="pdf-cv pdf-cv-light">
        <div class="pdf-cv-shell">
          <aside class="pdf-sidebar">
            <img class="pdf-portrait" src="img/profile.jpg" alt="Profile picture">
            <h1 class="pdf-name">${escapeHtml(about.firstName || "")} ${escapeHtml(about.lastName || "")}</h1>
            <p class="pdf-role">${escapeHtml(profileTitle)}</p>

            <section class="pdf-side-block">
              <h2 class="pdf-side-title">Profile</h2>
              <p class="pdf-side-text">${escapeHtml(about.summary || "")}</p>
            </section>

            <section class="pdf-side-block">
              <h2 class="pdf-side-title">Contact</h2>
              ${buildContactRows(about)}
            </section>

            <section class="pdf-side-block">
              <h2 class="pdf-side-title">Skills</h2>
              <div class="pdf-chip-wrap">${skillsChips}</div>
            </section>
          </aside>

          <main class="pdf-main">
            <section class="pdf-main-block">
              <h2 class="pdf-main-title"><span>Work Experience</span></h2>
              ${experienceItems}
            </section>

            <section class="pdf-main-block">
              <h2 class="pdf-main-title"><span>Education</span></h2>
              ${educationItems}
            </section>

            <section class="pdf-main-block">
              <h2 class="pdf-main-title"><span>Interests</span></h2>
              <div class="pdf-interests-grid">${interestsItems}</div>
            </section>

            <section class="pdf-main-block">
              <h2 class="pdf-main-title"><span>Awards</span></h2>
              <ul class="pdf-list">${awardsItems}</ul>
            </section>
          </main>
        </div>
      </article>`;
  }

  const imageToDataUrl = (image) => {
    try {
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      const side = Math.min(sourceWidth, sourceHeight);
      const canvas = document.createElement("canvas");
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext("2d");
      if (!ctx || !canvas.width || !canvas.height) {
        return null;
      }
      const sx = Math.max(0, (sourceWidth - side) / 2);
      const sy = Math.max(0, (sourceHeight - side) / 2);
      ctx.save();
      ctx.beginPath();
      ctx.arc(side / 2, side / 2, side / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(image, sx, sy, side, side, 0, 0, side, side);
      ctx.restore();
      return canvas.toDataURL("image/png");
    } catch (_error) {
      return null;
    }
  };

  const getVisibleProfileDataUrl = () => {
    const domImage = document.getElementById("profile-image") || document.getElementById("profile-image-mobile");
    if (!domImage || !domImage.complete || !domImage.naturalWidth) {
      return null;
    }
    return imageToDataUrl(domImage);
  };

  const loadImageForPdf = (src) =>
    new Promise((resolve) => {
      if (typeof window.profileImageDataUrl === "string" && window.profileImageDataUrl.startsWith("data:image/")) {
        const embeddedImage = new Image();
        embeddedImage.decoding = "async";
        embeddedImage.onload = () => resolve(imageToDataUrl(embeddedImage));
        embeddedImage.onerror = () => resolve(window.profileImageDataUrl);
        embeddedImage.src = window.profileImageDataUrl;
        return;
      }

      const fromDom = getVisibleProfileDataUrl();
      if (fromDom) {
        resolve(fromDom);
        return;
      }

      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(imageToDataUrl(image));
      image.onerror = () => resolve(null);
      image.src = src;
    });

  const buildFileName = (content) =>
    `${(content.about?.firstName || "resume")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")}_${(content.about?.lastName || "cv")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")}.pdf`;

  async function exportPdf() {
    const content = window.resumeContent;
    if (!content) {
      window.alert("Resume content is not loaded yet.");
      return;
    }

    const JsPdfCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (typeof JsPdfCtor !== "function") {
      window.alert("PDF library failed to load. Please refresh and try again.");
      return;
    }

    const fileName = buildFileName(content);

    const page = { w: 210, h: 297, m: 8 };
    const sidebar = { w: 58, bg: [229, 231, 235], border: [210, 214, 222] };
    const sidebarPanel = { x: 0, w: page.m + sidebar.w };
    const right = { x: page.m + sidebar.w + 8, w: page.w - page.m - (page.m + sidebar.w + 8) };
    let y = page.m + 10;

    const doc = new JsPdfCtor({ unit: "mm", format: "a4", orientation: "portrait" });
    const profileImage = await loadImageForPdf("img/profile.jpg");

    const drawPageShell = () => {
      doc.setFillColor(...sidebar.bg);
      // Extend the left panel to full page top/left/bottom edges.
      doc.rect(sidebarPanel.x, 0, sidebarPanel.w, page.h, "F");
    };

    const drawFooterClaim = () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text("© CV generated by buehlmann.io", page.w - 8, page.h - 4.2, { align: "right" });
    };

    const addNewPage = () => {
      drawFooterClaim();
      doc.addPage("a4", "portrait");
      drawPageShell();
      y = page.m + 10;
    };

    const split = (text, width) => doc.splitTextToSize(String(text || ""), width);
    const hForLines = (lineCount, lineHeight) => Math.max(lineCount, 1) * lineHeight;

    const ensureSpace = (height) => {
      if (y + height <= page.h - page.m) {
        return;
      }
      addNewPage();
    };

    const addSectionGap = () => {
      const gapMm = 5.5;
      ensureSpace(gapMm);
      y += gapMm;
    };

    const estimateExperienceHeight = (item) => {
      const titleLines = split(item.title || "", right.w - 42);
      const companyLines = split(item.company || "", right.w - 42);
      const dateLines = split(item.dateRange || "", 38);
      const bulletLines = asArray(item.bullets).map((b) => split(b, right.w - 5));
      const bulletsHeight = bulletLines.reduce((acc, lines) => acc + hForLines(lines.length, 4.2), 0);
      return hForLines(titleLines.length, 4.5) + hForLines(companyLines.length, 4) + Math.max(hForLines(dateLines.length, 4), 0) + bulletsHeight + 5;
    };

    const estimateEducationHeight = (item) => {
      const schoolLines = split(item.school || "", right.w - 42);
      const subtitleLines = split(item.subtitle || "", right.w - 42);
      const descLines = split(item.description || "", right.w);
      const extraLines = split(item.extra || "", right.w);
      return (
        hForLines(schoolLines.length, 4.5) +
        hForLines(subtitleLines.length, 4) +
        hForLines(descLines.length, 4) +
        hForLines(extraLines.length, 4) +
        5
      );
    };

    const estimateSimpleEntryHeight = (entry) => {
      const text = typeof entry === "string" ? entry : `${entry.label || ""}: ${entry.title || ""} ${entry.why || ""}`.trim();
      const lines = split(text, right.w - 5);
      return hForLines(lines.length, 4.2) + 2.6;
    };

    const drawSectionTitle = (title, firstBlockHeight) => {
      const titleHeight = 6;
      const sectionSafetyBuffer = 2;
      const minFollowingHeight = Number(firstBlockHeight) > 0 ? firstBlockHeight : 0;
      const requiredHeight = titleHeight + minFollowingHeight + sectionSafetyBuffer;
      ensureSpace(requiredHeight);
      const titleText = String(title).toUpperCase();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(17, 24, 39);
      doc.text(titleText, right.x, y);

      const textWidth = doc.getTextWidth(titleText);
      const lineStartX = right.x + textWidth + 2;
      const lineEndX = right.x + right.w;
      if (lineStartX < lineEndX) {
        doc.setDrawColor(209, 213, 219);
        doc.setLineWidth(0.2);
        doc.line(lineStartX, y - 1.1, lineEndX, y - 1.1);
      }

      y += titleHeight;
    };

    const drawProfileSidebar = () => {
      const panelCenterX = sidebarPanel.x + sidebarPanel.w / 2;
      const leftX = sidebarPanel.x + 6;
      const rightX = sidebarPanel.x + sidebarPanel.w - 6;
      const textW = sidebarPanel.w - 12;
      let leftY = page.m + 14;

      if (profileImage) {
        try {
          const format = profileImage.startsWith("data:image/png") ? "PNG" : "JPEG";
          doc.addImage(profileImage, format, panelCenterX - 24, leftY, 48, 48);
        } catch (_error) {
          doc.setDrawColor(180, 185, 195);
          doc.circle(panelCenterX, leftY + 24, 24);
        }
      } else {
        doc.setDrawColor(180, 185, 195);
        doc.circle(panelCenterX, leftY + 24, 24);
      }
      leftY += 54;

      const fullName = `${content.about?.firstName || ""} ${content.about?.lastName || ""}`.trim();
      const role = "Dipl. Informatiker EFZ";

      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(split(fullName, textW), panelCenterX, leftY, { align: "center" });
      leftY += hForLines(split(fullName, textW).length, 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text(split(role, textW), panelCenterX, leftY, { align: "center" });
      leftY += hForLines(split(role, textW).length, 4.2) + 4;

      const drawLeftBlock = (title, lines) => {
        doc.setDrawColor(184, 190, 202);
        doc.setLineWidth(0.3);
        doc.line(leftX, leftY, rightX, leftY);
        leftY += 4;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(42, 47, 56);
        doc.text(title.toUpperCase(), panelCenterX, leftY, { align: "center" });
        leftY += 4;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        lines.forEach((line) => {
          const wrapped = split(line, textW);
          doc.text(wrapped, panelCenterX, leftY, { align: "center" });
          leftY += hForLines(wrapped.length, 3.8);
        });
        leftY += 2;
      };

      const drawContactBlock = (items) => {
        if (!items.length) {
          return;
        }

        const iconSize = 5.2;
        const iconRadius = iconSize / 2;
        const rowGap = 3;
        const titleGap = 4.5;
        const titleY = leftY + 2.5;

        // "CONTACT" heading with horizontal separators on both sides.
        doc.setTextColor(55, 65, 81);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        const heading = "CONTACT";
        const headingWidth = doc.getTextWidth(heading);
        const headingCenterX = panelCenterX;
        doc.text(heading, headingCenterX, titleY, { align: "center" });

        const lineY = titleY - 1.2;
        const sideGap = 1.6;
        const leftLineStart = leftX;
        const leftLineEnd = headingCenterX - headingWidth / 2 - sideGap;
        const rightLineStart = headingCenterX + headingWidth / 2 + sideGap;
        const rightLineEnd = rightX;
        doc.setDrawColor(105, 99, 99);
        doc.setLineWidth(0.25);
        if (leftLineEnd > leftLineStart) {
          doc.line(leftLineStart, lineY, leftLineEnd, lineY);
        }
        if (rightLineEnd > rightLineStart) {
          doc.line(rightLineStart, lineY, rightLineEnd, lineY);
        }

        let rowY = leftY + titleGap + 2.5;
        const drawContactGlyph = (type, cx, cy) => {
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.35);

          if (type === "address") {
            doc.circle(cx, cy - 0.35, 0.8);
            doc.line(cx, cy + 0.3, cx, cy + 1.2);
            return;
          }

          if (type === "phone") {
            doc.line(cx - 0.9, cy + 0.6, cx - 0.25, cy - 0.05);
            doc.line(cx - 0.25, cy - 0.05, cx + 0.45, cy - 0.75);
            doc.line(cx + 0.45, cy - 0.75, cx + 0.95, cy - 0.25);
            doc.line(cx - 1.05, cy + 0.45, cx - 0.75, cy + 0.75);
            doc.line(cx + 0.8, cy - 0.4, cx + 1.1, cy - 0.1);
            return;
          }

          if (type === "email") {
            doc.rect(cx - 1.25, cy - 0.85, 2.5, 1.7);
            doc.line(cx - 1.25, cy - 0.85, cx, cy - 0.05);
            doc.line(cx + 1.25, cy - 0.85, cx, cy - 0.05);
            return;
          }

          // web
          doc.circle(cx, cy, 1.0);
          doc.line(cx, cy - 0.95, cx, cy + 0.95);
          doc.line(cx - 1.0, cy, cx + 1.0, cy);
          doc.line(cx - 0.68, cy - 0.65, cx + 0.68, cy - 0.65);
          doc.line(cx - 0.68, cy + 0.65, cx + 0.68, cy + 0.65);
        };

        items.forEach((item) => {
          const maxTextWidth = sidebarPanel.w - 20;
          const wrapped = split(item.value, maxTextWidth);
          const wrappedMaxWidth = wrapped.reduce((max, line) => Math.max(max, doc.getTextWidth(line)), 0);
          const rowContentWidth = iconSize + 3 + wrappedMaxWidth;
          const rowStartX = panelCenterX - rowContentWidth / 2;
          const iconCx = rowStartX + iconRadius;
          const textStartX = rowStartX + iconSize + 3;
          const iconCy = rowY - 1.1;

          // Icon-like dark circle with white marker letter.
          doc.setFillColor(105, 99, 99);
          doc.circle(iconCx, iconCy, iconRadius, "F");
          drawContactGlyph(item.type, iconCx, iconCy);

          // Contact value text.
          doc.setTextColor(55, 65, 81);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.2);
          doc.text(wrapped, textStartX, rowY + 0.2);

          rowY += hForLines(wrapped.length, 3.8) + rowGap;
        });

        leftY = rowY;
      };

      drawLeftBlock("Profile", [content.about?.summary || ""]);
      const contactItems = [
        { type: "address", value: content.about?.addressLine || "" },
        { type: "phone", value: content.about?.phone || "" },
        { type: "email", value: content.about?.email || "" },
        { type: "web", value: content.about?.website || "" }
      ].filter((entry) => String(entry.value).trim().length > 0);

      if (contactItems.length) {
        const contactHeight =
          7 +
          contactItems.reduce(
            (acc, item) => acc + hForLines(split(item.value, textW - 8).length, 3.8) + 3,
            0
          );
        const bottomPadding = 6;
        const anchoredTop = page.h - bottomPadding - contactHeight;
        if (anchoredTop > leftY) {
          leftY = anchoredTop;
        }
        drawContactBlock(contactItems);
      }

    };

    const drawExperienceItem = (item) => {
      const titleLines = split(item.title || "", right.w - 42);
      const companyLines = split(item.company || "", right.w - 42);
      const dateLines = split(item.dateRange || "", 38);
      const bulletLines = asArray(item.bullets).map((b) => split(b, right.w - 5));
      const blockHeight = estimateExperienceHeight(item);
      ensureSpace(blockHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.text(titleLines, right.x, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text(dateLines, right.x + right.w, y, { align: "right" });

      y += hForLines(titleLines.length, 4.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(55, 65, 81);
      doc.text(companyLines, right.x, y);
      y += hForLines(companyLines.length, 4) + 1.3;

      doc.setFontSize(9.2);
      asArray(item.bullets).forEach((bullet, index) => {
        const lines = bulletLines[index];
        doc.text("-", right.x, y);
        doc.text(lines, right.x + 4, y);
        y += hForLines(lines.length, 4.2);
      });
      y += 2.6;
    };

    const drawEducationItem = (item) => {
      const schoolLines = split(item.school || "", right.w - 42);
      const subtitleLines = split(item.subtitle || "", right.w - 42);
      const dateLines = split(item.dateRange || "", 38);
      const descLines = split(item.description || "", right.w);
      const extraLines = split(item.extra || "", right.w);
      const blockHeight = estimateEducationHeight(item);
      ensureSpace(blockHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.text(schoolLines, right.x, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text(dateLines, right.x + right.w, y, { align: "right" });

      y += hForLines(schoolLines.length, 4.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(55, 65, 81);
      doc.text(subtitleLines, right.x, y);
      y += hForLines(subtitleLines.length, 4);
      doc.text(descLines, right.x, y);
      y += hForLines(descLines.length, 4);
      doc.setTextColor(107, 114, 128);
      doc.text(extraLines, right.x, y);
      y += hForLines(extraLines.length, 4) + 2.6;
    };

    const drawSimpleListBlock = (title, entries) => {
      if (!entries.length) {
        return;
      }
      drawSectionTitle(title, estimateSimpleEntryHeight(entries[0]));
      entries.forEach((entry) => {
        const text = typeof entry === "string" ? entry : `${entry.label || ""}: ${entry.title || ""} ${entry.why || ""}`.trim();
        const lines = split(text, right.w - 5);
        ensureSpace(hForLines(lines.length, 4.2) + 2.6);
        doc.setTextColor(55, 65, 81);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.2);
        doc.text("-", right.x, y);
        doc.text(lines, right.x + 4, y);
        y += hForLines(lines.length, 4.2) + 2.6;
      });
      y += 2.6;
    };

    try {
      downloadButton.disabled = true;
      drawPageShell();
      drawProfileSidebar();

      const experienceEntries = asArray(content.experience);
      if (experienceEntries.length) {
        drawSectionTitle("Work Experience", estimateExperienceHeight(experienceEntries[0]));
        experienceEntries.forEach(drawExperienceItem);
        addSectionGap();
      }

      const educationEntries = asArray(content.education);
      if (educationEntries.length) {
        drawSectionTitle("Education", estimateEducationHeight(educationEntries[0]));
        educationEntries.forEach(drawEducationItem);
        addSectionGap();
      }

      const skillEntries = asArray(content.skills?.workflow);
      drawSimpleListBlock("Skills", skillEntries);
      if (skillEntries.length) {
        addSectionGap();
      }

      const interestEntries = Array.isArray(content.interests?.buckets)
        ? content.interests.buckets
        : asArray(content.interests);
      drawSimpleListBlock("Interests", interestEntries);
      if (interestEntries.length) {
        addSectionGap();
      }
      drawSimpleListBlock("Awards", asArray(content.awards));

      drawFooterClaim();
      doc.save(fileName);
    } catch (error) {
      console.error("PDF export failed.", error);
      window.alert("PDF export failed. Please try again. If it still fails, open the browser console and share the error.");
    } finally {
      downloadButton.disabled = false;
    }
  }

  downloadButton.addEventListener("click", exportPdf);
})();
