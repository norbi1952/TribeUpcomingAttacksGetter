// ==UserScript==
// @name          TribeUpcomingAttacksGetter
// @version       0.2.1
// @author        szelbi
// @website       https://szelbi.ovh/
// @match         *://*.plemiona.pl/*
// @grant         none
// @updateURL     https://raw.githubusercontent.com/sz3lbi/TribeUpcomingAttacksGetter/master/TribeUpcomingAttacksGetter.js
// @downloadURL		https://raw.githubusercontent.com/sz3lbi/TribeUpcomingAttacksGetter/master/TribeUpcomingAttacksGetter.js
// ==/UserScript==

(function () {
  "use strict";

  var url = window.location.href;

  if (
    !url.includes("screen=ally&mode=members_troops") &&
    !url.includes("screen=ally&mode=members_defense")
  ) {
    sessionStorage.removeItem("selectOptions");
    sessionStorage.removeItem("playersArray");
    return;
  }

  var selectElement;

  document.onreadystatechange = () => {
    if (document.readyState === "complete") {
      selectElement = document.querySelector("form > select[name='player_id']");
      getData();

      let getTroopsButton = document.createElement("button");
      getTroopsButton.setAttribute("type", "button");
      getTroopsButton.setAttribute("class", "btn btn-default float_right");
      getTroopsButton.addEventListener("click", buttonOnClick);
      getTroopsButton.innerHTML = "Pobierz dane o atakach";

      let allyContent = document.getElementById("ally_content");
      allyContent.insertBefore(getTroopsButton, allyContent.firstChild);

      let modalCSS = `
				.modal {
					display: none;
					position: fixed;
					z-index: 10;
					padding-top: 100px;
					left: 0;
					top: 0;
					width: 100%;
					height: 100%;
					overflow: auto;
				}
				.modal-content {
          background-color: #ead5aa;
          margin: auto;
          padding: 20px;
					border: 1px solid #7d510f;
					width: 40%;
				}
				.close {
				  color: #603000;
				  float: right;
				  font-size: 28px;
				  font-weight: bold;
				}
				.close:hover,
				.close:focus {
				  color: #803000;
				  text-decoration: none;
				  cursor: pointer;
				}
				.textarea {
					width: 100%;
					height: 30em;
					resize: none;
				}
			`;
      addCSS(modalCSS);

      let modalDiv = document.createElement("div");
      modalDiv.setAttribute("id", "js-modal");
      modalDiv.setAttribute("class", "modal");
      modalDiv.innerHTML =
        '<div class="modal-content"><span class="close" id="js-close">&times;</span><p><textarea class="textarea" id="js-text-box"></textarea></p></div>';
      allyContent.parentNode.insertBefore(modalDiv, allyContent.nextSibling);

      document.getElementById("js-close").onclick = closeModalOnClick;

      if (typeof Storage !== "undefined") {
        let sessionStorageItem;
        if ((sessionStorageItem = sessionStorage.getItem("selectOptions"))) {
          disableButton(getTroopsButton);

          let selectOptions = JSON.parse(sessionStorageItem);
          getNextPlayerAttacks(selectOptions);
        }
      } else {
        disableButton(getTroopsButton);
        alert(
          'Twoja przeglądarka nie wspiera "Web Storage". Zaktualizuj ją do najnowszej wersji.'
        );
      }
    }
  };

  function addCSS(css) {
    let style = document.createElement("style");
    style.innerHTML = css;
    document.head.appendChild(style);
  }

  function closeModalOnClick() {
    document.getElementById("js-modal").style.display = "none";
  }

  function disableButton(button) {
    button.classList.add("btn-disabled");
    button.disabled = true;
  }

  function buttonOnClick() {
    disableButton(this);

    if (selectElement) {
      let selectOptions = [];
      for (const option of selectElement.options) {
        if (!option.hidden && !option.disabled) {
          selectOptions.push(option.value);
        }
      }
      sessionStorage.setItem("selectOptions", JSON.stringify(selectOptions));
      getNextPlayerAttacks(selectOptions);
    }
  }

  function getNextPlayerAttacks(selectOptions) {
    if (selectOptions.length && selectElement) {
      getPlayerVillagesAmount(getWorldNumFromUrl(), selectOptions, checkAmount);
    } else {
      sessionStorage.removeItem("selectOptions");

      let text = "";
      let sessionStorageItem;
      if ((sessionStorageItem = sessionStorage.getItem("playersArray"))) {
        let parsedJSON = JSON.parse(sessionStorageItem);
        let playersArray = parsedJSON.map((e1) => {
          let player = new Player(e1.name);
          player.villages = e1.villages.map(
            (e2) => new Village(e2.coords, e2.attacksIncoming)
          );
          return player;
        });

        for (const player of playersArray) {
          text += `${player.name}\n`;
          for (const village of player.villages) {
            text += `${village.coords} - ${village.attacksIncoming}\n`;
          }
          text += "\n";
        }

        sessionStorage.removeItem("playersArray");
      }

      if (!text) {
        text = "Brak ataków na graczy.";
      }
      document.getElementById("js-text-box").value = text.trim();
      document.getElementById("js-modal").style.display = "block";
    }
  }

  function getData() {
    const tableRows = document.querySelectorAll(
      ".table-responsive > .vis > tbody > tr"
    );

    if (tableRows && selectElement) {
      let step = 1;
      if (url.includes("screen=ally&mode=members_defense")) {
        step = 2;
      }

      let sessionStorageItem;
      let playersArray = [];
      if ((sessionStorageItem = sessionStorage.getItem("playersArray"))) {
        playersArray = JSON.parse(sessionStorageItem);
      }

      let player = new Player(
        selectElement.options[selectElement.selectedIndex].text
      );

      for (let i = 1; i < tableRows.length; i += step) {
        const rowData = tableRows[i].querySelectorAll("td");
        const lastCol = rowData[rowData.length - 1];

        if (!lastCol.classList.contains("hidden")) {
          let villageName = rowData[0].innerText;
          let result = villageName.match(
            /(?:\()(\d{3}\|\d{3})(?:\)\s\K\d{2})$/
          );
          let coords = result[1];
          let attacksIncoming = lastCol.innerText;
          player.addVillage(new Village(coords, parseInt(attacksIncoming)));
        }
      }

      if (player.villages.length) {
        playersArray.push(player);
        sessionStorage.setItem("playersArray", JSON.stringify(playersArray));
      }
    }
  }

  function getWorldNumFromUrl() {
    return url.match(/(?:pl)(\d*)(?:\.plemiona\.pl)/)[1];
  }

  function getPlayerVillagesAmount(worldNum, selectOptions, callback) {
    let xhttp;

    xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        let parser = new DOMParser();
        const doc = parser.parseFromString(this.responseText, "text/html");

        const headers = doc.querySelectorAll(
          "#villages_list > thead > tr > th"
        );
        if (headers.length) {
          for (const header of headers) {
            const result = header.innerText.match(/(?:Wioski\s\()(\d*)(?:\))/);
            if (result) {
              callback(result[1], selectOptions);
            }
          }
        }
      }
    };
    xhttp.open(
      "GET",
      `https://pl${worldNum}.plemiona.pl/guest.php?screen=info_player&id=${selectOptions[0]}`,
      true
    );
    xhttp.send();
  }

  function checkAmount(villageAmount, selectOptions) {
    const id = selectOptions[0];

    selectOptions.shift();
    sessionStorage.setItem("selectOptions", JSON.stringify(selectOptions));

    if (villageAmount > 0) {
      selectElement.value = id;
      selectElement.form.submit();
    } else {
      getNextPlayerAttacks(selectOptions);
    }
  }

  class Player {
    constructor(name) {
      this._name = name;
      this._villages = [];
    }

    get name() {
      return this._name;
    }

    set name(name) {
      this._name = name;
    }

    get villages() {
      return this._villages;
    }

    set villages(villages) {
      this._villages = villages;
    }

    addVillage(village) {
      if (village instanceof Village) {
        this._villages.push(village);
      }
    }

    removeVillage(village) {
      const index = this._villages.indexOf(village);
      if (index > -1) {
        this._villages.splice(index, 1);
      }
    }

    toJSON() {
      return { name: this._name, villages: this._villages };
    }
  }

  class Village {
    constructor(coords, attacksIncoming) {
      this._coords = coords;
      this._attacksIncoming = attacksIncoming;
    }

    get coords() {
      return this._coords;
    }

    set coords(coords) {
      this._coords = coords;
    }

    get attacksIncoming() {
      return this._attacksIncoming;
    }

    set attacksIncoming(attacksIncoming) {
      this._attacksIncoming = attacksIncoming;
    }

    toJSON() {
      return { coords: this._coords, attacksIncoming: this._attacksIncoming };
    }
  }
})();
