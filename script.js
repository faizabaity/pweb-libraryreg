const MEMBER_STORAGE_KEY = "libraryreg.members";
const MEMBER_FIELDS = [
  "fullName",
  "nrp",
  "major",
  "memberType",
  "address",
  "phone",
  "email",
];

function getMembers() {
  const storedMembers = localStorage.getItem(MEMBER_STORAGE_KEY);

  if (storedMembers === null) {
    return [];
  }

  const members = JSON.parse(storedMembers);

  if (
    !Array.isArray(members) ||
    members.some(
      (member) =>
        member === null ||
        typeof member !== "object" ||
        MEMBER_FIELDS.some((field) => typeof member[field] !== "string"),
    )
  ) {
    throw new Error("Data anggota tersimpan tidak memiliki format yang valid.");
  }

  return members;
}

function normalizeNrp(nrp) {
  return nrp.trim().replace(/\s+/g, "").toLocaleLowerCase("id");
}

function showFeedback(element, message) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.hidden = false;
}

function setNrpError(form, message) {
  const nrpInput = form.elements.namedItem("nrp");
  const errorElement = document.querySelector("#nrpError");

  nrpInput.setCustomValidity(message);
  nrpInput.setAttribute("aria-invalid", String(Boolean(message)));
  errorElement.textContent = message;
}

function renderMembers() {
  const tableBody = document.querySelector("#membersTableBody");

  if (!tableBody) {
    return;
  }

  const countElement = document.querySelector("#membersCount");
  const emptyState = document.querySelector("#membersEmpty");
  const errorElement = document.querySelector("#membersError");

  try {
    const members = getMembers();
    const rows = members.map((member, index) => {
      const row = document.createElement("tr");
      const values = [
        String(index + 1),
        member.fullName,
        member.nrp,
        member.major,
        member.memberType,
        member.address,
        member.phone,
        member.email,
      ];

      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });

      return row;
    });

    tableBody.replaceChildren(...rows);
    countElement.textContent = `${members.length} anggota terdaftar`;
    emptyState.hidden = members.length > 0;
  } catch (error) {
    console.error("Gagal membaca data anggota dari penyimpanan lokal.", error);
    countElement.textContent = "Data anggota tidak dapat dimuat.";
    emptyState.hidden = true;
    showFeedback(
      errorElement,
      "Data anggota tidak dapat dibaca dari penyimpanan browser. Periksa penyimpanan lokal lalu muat ulang halaman.",
    );
  }

  if (new URLSearchParams(window.location.search).get("registered") === "1") {
    showFeedback(
      document.querySelector("#membersFeedback"),
      "Pendaftaran berhasil. Data anggota telah ditambahkan.",
    );
  }
}

function initializeRegistrationForm() {
  const form = document.querySelector("#registrationForm");

  if (!form) {
    return;
  }

  const feedback = document.querySelector("#registrationFeedback");
  const nrpInput = form.elements.namedItem("nrp");

  function validateNrp() {
    const value = nrpInput.value.trim();

    if (!value) {
      setNrpError(form, "");
      return;
    }

    try {
      const existingMembers = getMembers();
      const duplicate = existingMembers.some(
        (member) => normalizeNrp(member.nrp) === normalizeNrp(value),
      );

      setNrpError(
        form,
        duplicate ? "Nomor Registrasi Pokok/NRP ini sudah terdaftar." : "",
      );
    } catch (error) {
      console.error("Gagal memeriksa keunikan NRP.", error);
      setNrpError(form, "Data anggota tidak dapat diperiksa. Muat ulang halaman dan coba lagi.");
    }
  }

  nrpInput.addEventListener("input", validateNrp);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    feedback.hidden = true;
    validateNrp();

    const requiredInputs = [...form.querySelectorAll("input[required]")];

    requiredInputs.forEach((input) => {
      if (input.type === "radio") {
        input.setCustomValidity(
          form.querySelector(`input[name="${input.name}"]:checked`)
            ? ""
            : "Pilih jenis anggota.",
        );
      } else if (!input.value.trim()) {
        input.setCustomValidity("Kolom ini wajib diisi.");
      } else if (input.type === "email" && input.validity.typeMismatch) {
        input.setCustomValidity("Masukkan alamat email dengan format yang valid.");
      } else if (input !== nrpInput || !input.validationMessage) {
        input.setCustomValidity("");
      }
    });

    if (!form.reportValidity()) {
      const firstInvalidInput = form.querySelector(":invalid");
      firstInvalidInput?.focus();
      return;
    }

    let members;

    try {
      members = getMembers();
    } catch (error) {
      console.error("Gagal membaca data anggota sebelum pendaftaran.", error);
      showFeedback(
        feedback,
        "Data anggota tidak dapat dibaca, sehingga pendaftaran belum disimpan. Muat ulang halaman dan coba lagi.",
      );
      feedback.classList.add("form-feedback-error");
      return;
    }

    const newMember = Object.fromEntries(
      MEMBER_FIELDS.map((field) => {
        const value = new FormData(form).get(field);
        return [field, String(value).trim()];
      }),
    );

    if (
      members.some(
        (member) => normalizeNrp(member.nrp) === normalizeNrp(newMember.nrp),
      )
    ) {
      setNrpError(form, "Nomor Registrasi Pokok/NRP ini sudah terdaftar.");
      nrpInput.reportValidity();
      nrpInput.focus();
      return;
    }

    try {
      localStorage.setItem(
        MEMBER_STORAGE_KEY,
        JSON.stringify([...members, newMember]),
      );
    } catch (error) {
      console.error("Gagal menyimpan pendaftaran ke penyimpanan lokal.", error);
      showFeedback(
        feedback,
        "Data pendaftaran tidak dapat disimpan di browser ini. Periksa ruang penyimpanan lalu coba lagi.",
      );
      feedback.classList.add("form-feedback-error");
      return;
    }

    window.location.href = "dataanggota.html?registered=1";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const navigation = document.querySelector("#mainNavigation");

  if (navigation && typeof bootstrap !== "undefined") {
    const collapse = bootstrap.Collapse.getOrCreateInstance(navigation, {
      toggle: false,
    });

    navigation.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.matchMedia("(max-width: 991.98px)").matches) {
          collapse.hide();
        }
      });
    });
  }

  initializeRegistrationForm();
  renderMembers();
});
