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
  const noResults = document.querySelector("#membersNoResults");
  let membersLoaded = false;

  try {
    const members = getMembers();
    membersLoaded = true;
    const query = normalizeSearch(
      document.querySelector("#memberSearch").value,
    );
    const matchingMembers = members
      .map((member, index) => ({ member, index }))
      .filter(({ member }) =>
        normalizeSearch(`${member.fullName} ${member.nrp}`).includes(query),
      );

    tableBody.replaceChildren(
      ...matchingMembers.map(({ member, index }) =>
        createMemberRow(member, index),
      ),
    );
    countElement.textContent = `${members.length} Anggota`;
    emptyState.hidden = members.length > 0;
    noResults.hidden = members.length === 0 || matchingMembers.length > 0;
  } catch (error) {
    console.error("Gagal membaca data anggota dari penyimpanan lokal.", error);
    countElement.textContent = "Data tidak tersedia";
    emptyState.hidden = true;
    noResults.hidden = true;
    showMemberToast(
      "Data anggota tidak dapat dibaca dari penyimpanan browser.",
      "error",
    );
  }

  if (
    membersLoaded &&
    new URLSearchParams(window.location.search).get("registered") === "1"
  ) {
    showMemberToast(
      "Pendaftaran berhasil. Data anggota telah ditambahkan.",
      "success",
    );
    window.history.replaceState({}, "", window.location.pathname);
  }
}

function normalizeSearch(value) {
  return value.trim().toLocaleLowerCase("id");
}

function createMemberRow(member, index) {
  const row = document.createElement("tr");
  row.dataset.memberIndex = String(index);

  [member.fullName, member.nrp, member.major, member.memberType].forEach(
    (value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    },
  );

  const actions = document.createElement("td");
  actions.className = "member-row-actions";

  [
    ["detail", "Detail"],
    ["edit", "Edit"],
    ["delete", "Hapus"],
  ].forEach(([action, label]) => {
    const button = document.createElement("button");
    button.className = "member-action-button";
    button.type = "button";
    button.dataset.memberAction = action;
    button.setAttribute(
      "aria-label",
      `${label} data anggota ${member.fullName}`,
    );
    button.textContent = label;
    actions.append(button);
  });

  row.append(actions);
  return row;
}

function showMemberToast(message, variant = "success") {
  const toastElement = document.querySelector("#membersToast");

  if (!toastElement || typeof bootstrap === "undefined") {
    const fallback = document.querySelector("#membersStorageError");

    if (fallback) {
      showFeedback(fallback, message);
    }
    return;
  }

  document.querySelector("#membersToastMessage").textContent = message;
  toastElement.classList.toggle("member-toast-error", variant === "error");
  bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 4500 }).show();
}

function showStorageError(error, message) {
  console.error(message, error);
  showMemberToast(message, "error");
}

function initializeMemberManagement() {
  const tableBody = document.querySelector("#membersTableBody");

  if (!tableBody) {
    return;
  }

  if (typeof bootstrap === "undefined") {
    showMemberToast(
      "Komponen dialog tidak dapat dimuat. Muat ulang halaman dan coba lagi.",
      "error",
    );
    return;
  }

  const searchInput = document.querySelector("#memberSearch");
  const detailModal = bootstrap.Modal.getOrCreateInstance(
    document.querySelector("#detailModal"),
  );
  const editModal = bootstrap.Modal.getOrCreateInstance(
    document.querySelector("#editModal"),
  );
  const deleteModal = bootstrap.Modal.getOrCreateInstance(
    document.querySelector("#deleteModal"),
  );
  const editForm = document.querySelector("#editMemberForm");
  const editNrp = editForm.elements.namedItem("nrp");
  const editNrpError = document.querySelector("#editNrpError");
  let editingNrp = "";
  let deletingNrp = "";

  searchInput.addEventListener("input", renderMembers);

  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-member-action]");

    if (!button) {
      return;
    }

    const row = button.closest("[data-member-index]");
    const memberIndex = Number(row?.dataset.memberIndex);

    if (!Number.isInteger(memberIndex)) {
      showMemberToast("Data anggota tidak ditemukan. Muat ulang halaman.", "error");
      return;
    }

    let members;

    try {
      members = getMembers();
    } catch (error) {
      showStorageError(error, "Data anggota tidak dapat dibaca.");
      return;
    }

    const member = members[memberIndex];

    if (!member) {
      renderMembers();
      showMemberToast("Data anggota telah berubah. Daftar diperbarui.", "error");
      return;
    }

    if (button.dataset.memberAction === "detail") {
      [
        ["detailFullName", member.fullName],
        ["detailNrp", member.nrp],
        ["detailMajor", member.major],
        ["detailMemberType", member.memberType],
        ["detailAddress", member.address],
        ["detailPhone", member.phone],
        ["detailEmail", member.email],
      ].forEach(([id, value]) => {
        document.getElementById(id).textContent = value;
      });
      detailModal.show();
      return;
    }

    if (button.dataset.memberAction === "edit") {
      editingNrp = member.nrp;
      editForm.elements.namedItem("fullName").value = member.fullName;
      editNrp.value = member.nrp;
      editForm.elements.namedItem("major").value = member.major;
      editForm.elements.namedItem("address").value = member.address;
      editForm.elements.namedItem("phone").value = member.phone;
      editForm.elements.namedItem("email").value = member.email;
      editForm
        .querySelectorAll('input[name="memberType"]')
        .forEach((input) => {
          input.checked = input.value === member.memberType;
          input.setCustomValidity("");
        });
      setEditNrpError("");
      editForm
        .querySelectorAll("input:not([type='radio'])")
        .forEach((input) => input.setCustomValidity(""));
      editModal.show();
      return;
    }

    if (button.dataset.memberAction === "delete") {
      deletingNrp = member.nrp;
      document.querySelector("#deleteFullName").textContent = member.fullName;
      document.querySelector("#deleteNrp").textContent =
        `Nomor Registrasi Pokok/NRP: ${member.nrp}`;
      document.querySelector("#deleteMajor").textContent =
        `Program Studi: ${member.major}`;
      document.querySelector("#deleteMemberType").textContent =
        `Jenis Anggota: ${member.memberType}`;
      deleteModal.show();
    }
  });

  function setEditNrpError(message) {
    editNrp.setCustomValidity(message);
    editNrp.setAttribute("aria-invalid", String(Boolean(message)));
    editNrpError.textContent = message;
  }

  function validateEditNrp() {
    const value = editNrp.value.trim();

    if (!value) {
      setEditNrpError("");
      return;
    }

    try {
      const members = getMembers();
      const duplicate = members.some(
        (member) =>
          normalizeNrp(member.nrp) !== normalizeNrp(editingNrp) &&
          normalizeNrp(member.nrp) === normalizeNrp(value),
      );
      setEditNrpError(
        duplicate ? "Nomor Registrasi Pokok/NRP ini sudah digunakan." : "",
      );
    } catch (error) {
      showStorageError(error, "Keunikan NRP tidak dapat diperiksa.");
      setEditNrpError("Data anggota tidak dapat diperiksa.");
    }
  }

  editNrp.addEventListener("input", validateEditNrp);

  editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    validateEditNrp();

    const fields = [...editForm.querySelectorAll("input[required]")];
    fields.forEach((input) => {
      if (input.type === "radio") {
        input.setCustomValidity(
          editForm.querySelector(
            `input[name="${input.name}"]:checked`,
          )
            ? ""
            : "Pilih jenis anggota.",
        );
      } else if (!input.value.trim()) {
        input.setCustomValidity("Kolom ini wajib diisi.");
      } else if (input.type === "email" && input.validity.typeMismatch) {
        input.setCustomValidity("Masukkan alamat email dengan format yang valid.");
      } else if (input !== editNrp || !input.validationMessage) {
        input.setCustomValidity("");
      }
    });

    if (!editForm.reportValidity()) {
      editForm.querySelector(":invalid")?.focus();
      return;
    }

    try {
      const members = getMembers();
      const memberIndex = members.findIndex(
        (member) => normalizeNrp(member.nrp) === normalizeNrp(editingNrp),
      );

      if (memberIndex < 0) {
        editModal.hide();
        renderMembers();
        showMemberToast("Anggota tidak ditemukan. Daftar telah diperbarui.", "error");
        return;
      }

      const duplicateNrp = members.some(
        (member, index) =>
          index !== memberIndex &&
          normalizeNrp(member.nrp) === normalizeNrp(editNrp.value),
      );

      if (duplicateNrp) {
        setEditNrpError("Nomor Registrasi Pokok/NRP ini sudah digunakan.");
        editNrp.reportValidity();
        editNrp.focus();
        return;
      }

      const formData = new FormData(editForm);
      const updatedMember = Object.fromEntries(
        MEMBER_FIELDS.map((field) => [
          field,
          String(formData.get(field)).trim(),
        ]),
      );
      members[memberIndex] = updatedMember;
      localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(members));
      editingNrp = "";
      editModal.hide();
      renderMembers();
      showMemberToast("Data anggota berhasil diperbarui.", "success");
    } catch (error) {
      showStorageError(error, "Perubahan tidak dapat disimpan. Coba lagi.");
    }
  });

  document
    .querySelector("#confirmDeleteButton")
    .addEventListener("click", () => {
      try {
        const members = getMembers();
        const memberIndex = members.findIndex(
          (member) => normalizeNrp(member.nrp) === normalizeNrp(deletingNrp),
        );

        if (memberIndex < 0) {
          deleteModal.hide();
          renderMembers();
          showMemberToast("Anggota tidak ditemukan. Daftar telah diperbarui.", "error");
          return;
        }

        members.splice(memberIndex, 1);
        localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(members));
        deletingNrp = "";
        deleteModal.hide();
        renderMembers();
        showMemberToast("Data anggota berhasil dihapus.", "success");
      } catch (error) {
        showStorageError(error, "Data anggota tidak dapat dihapus. Coba lagi.");
      }
    });
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
  initializeMemberManagement();
  renderMembers();
});

window.addEventListener("storage", (event) => {
  if (event.key === MEMBER_STORAGE_KEY) {
    renderMembers();
  }
});
