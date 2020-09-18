// ==UserScript==
// @name			TribeUpcomingAttacksGetter
// @version			0.1.1
// @author			szelbi
// @website			https://szelbi.ovh/
// @match			*://*.plemiona.pl/*
// @grant			none
// @updateURL		https://raw.githubusercontent.com/norbi1952/TribeUpcomingAttacksGetter/master/TribeUpcomingAttacksGetter.js
// @downloadURL		https://raw.githubusercontent.com/norbi1952/TribeUpcomingAttacksGetter/master/TribeUpcomingAttacksGetter.js
// ==/UserScript==


(function() {
	"use strict";

	var url = window.location.href;

	if(!url.includes("screen=ally&mode=members_troops") && !url.includes("screen=ally&mode=members_defense")) {
		if (sessionStorage.getItem("selectOptions")) {
			sessionStorage.removeItem("selectOptions");
		}
		if (sessionStorage.getItem("villageDictionary")) {
			sessionStorage.removeItem("villageDictionary");
		}
		return;
	}

	document.onreadystatechange = () => {
		if (document.readyState === "complete") {
			getData();

			let allyContent = document.getElementById("ally_content");

			let getTroopsButton = document.createElement("button");
			getTroopsButton.setAttribute("type", "button");
			getTroopsButton.setAttribute("class", "btn btn-default float_right");
			getTroopsButton.addEventListener("click", buttonOnClick);
			getTroopsButton.innerHTML = "Pobierz dane o atakach";
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
					background-color: #fefefe;
					margin: auto;padding: 20px;
					border: 1px solid #888;
					width: 80%;
				}
				.close {
				  color: #aaaaaa;
				  float: right;
				  font-size: 28px;
				  font-weight: bold;
				}
				.close:hover,
				.close:focus {
				  color: #000;
				  text-decoration: none;
				  cursor: pointer;
				}
				.textarea {
					width: 100%;
					height: 30em;
					resize: none;
				}
			`

			addCSS(modalCSS);

			let modalDiv = document.createElement("div");
			modalDiv.setAttribute("id", "atg-modal");
			modalDiv.setAttribute("class", "modal");

			modalDiv.innerHTML = "<div class=\"modal-content\"><span class=\"close\" id=\"atg-close\">&times;</span><p><textarea class=\"textarea\" id=\"atg-text-box\"></textarea></p></div>";

			allyContent.parentNode.insertBefore(modalDiv, allyContent.nextSibling);

			document.getElementById("atg-close").onclick = closeModalOnClick;

			if (typeof(Storage) !== "undefined") {
				if (sessionStorage.getItem("selectOptions")) {
					disableButton(getTroopsButton);

					let selectOptions = JSON.parse(sessionStorage.getItem("selectOptions"));
					getNextPlayerTroops(selectOptions);
				}
			} else {
				disableButton(getTroopsButton);
				alert("Twoja przeglądarka nie wspiera \"Web Storage\". Zaktualizuj ją do najnowszej wersji.");
			}
		}
	};

	function addCSS(css) {
		let style = document.createElement("style");
		style.innerHTML = css;
		document.head.appendChild(style);
	}

	function closeModalOnClick() {
		document.getElementById("atg-modal").style.display = "none";
	}

	function disableButton(button) {
		button.classList.add('btn-disabled');
		button.disabled = true;
	}

	function buttonOnClick() {
		disableButton(this);
		
		let selectElement = document.querySelector("form > select[name='player_id']");
		if(selectElement) {
			let selectOptions = [];

			for (let i = 0; i < selectElement.options.length; i++) {
				let option = selectElement.options[i];

				if(!option.hidden && !option.disabled) {
					selectOptions.push(option.value);
				}
			}
			sessionStorage.setItem("selectOptions", JSON.stringify(selectOptions));

			getNextPlayerTroops(selectOptions);
		}
	}

	function getNextPlayerTroops(selectOptions) {
		if(selectOptions.length) {
			let selectElement = document.querySelector("form > select[name='player_id']");
			if(selectElement) {
				selectElement.value = selectOptions[0];
				selectElement.form.submit();

				selectOptions.shift();

				sessionStorage.setItem("selectOptions", JSON.stringify(selectOptions));
			}
		} else {
			sessionStorage.removeItem("selectOptions");

			if (sessionStorage.getItem("villageDictionary")) {
				let villageDictionary = JSON.parse(sessionStorage.getItem("villageDictionary"));

				let text = "";
				for(let coords in villageDictionary) {
					let attacksIncoming = villageDictionary[coords];
					text = `${text}${coords} - ${attacksIncoming}\n`;
				}
				let modal = document.getElementById("atg-modal");
				modal.style.display = "block";

				if(!text) {
					text = "Brak ataków na graczy.";
				}
				document.getElementById("atg-text-box").value = text;

				sessionStorage.removeItem("villageDictionary");
			}
		}
	}

	function getData() {
		let tableRows = document.querySelectorAll('.table-responsive > .vis > tbody > tr');

		let step = 1;
		if(url.includes("screen=ally&mode=members_defense")) {
			step = 2;
		}

		if(tableRows) {
			let villageDictionary = {};
			if (sessionStorage.getItem("villageDictionary")) {
				villageDictionary = JSON.parse(sessionStorage.getItem("villageDictionary"));
			}

			for (let i = 1; i < tableRows.length; i = i + step) {
				let rowData = tableRows[i].querySelectorAll('td');

				if(!rowData[rowData.length - 1].classList.contains("hidden")) {
					let villageName = rowData[0].innerText;
					let result = villageName.match(/(?:\()(\d{3}\|\d{3})(?:\)\s\K\d{2})$/);
					let coords = result[1];

					let attacksIncoming = rowData[rowData.length - 1].innerText;

					villageDictionary[coords] = attacksIncoming;
				}
			}

			sessionStorage.setItem("villageDictionary", JSON.stringify(villageDictionary));
		}
	}
})();