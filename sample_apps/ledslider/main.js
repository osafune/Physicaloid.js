//////////////////////////////////////////////////
//  physicaloid.js �T���v�� 
//////////////////////////////////////////////////

// �R���t�B�O���[�V��������RBF�� 
var rbfurl = "https://dl.dropboxusercontent.com/u/68933379/physicaloid/lib/peridot/sample_ledslider/sample_ledslider_top.rbf";

// Physicaloid�I�u�W�F�N�g�𐶐� 
var myps = new Physicaloid();


// �J�n���ɌĂяo����� 
var select;

window.onload = function() {

	select = document.getElementById('ports');

	// �V���A���|�[�g�̎擾 
	var scanport = function() {
		chrome.serial.getPorts(function (ports) {
			// �G�������g��S�č폜 
			while(select.firstChild){
				select.removeChild(select.firstChild);
			}

			// �X�L�������ʂ�ǉ� 
			for (var i=0; i<ports.length; i++) {
				var port = ports[i];
				select.appendChild(new Option(port, port));
			}

			// �I���ł���|�[�g�����邩 
			if (select.firstChild) {
				document.getElementById('connect').disabled = false;
			} else {
				document.getElementById('connect').disabled = true;
			}
		});
	}

	document.getElementById('connect').addEventListener('click', connectPort);
	document.getElementById('scanport').addEventListener('click', scanport);

	document.getElementById('config').addEventListener('click', configSetup);
	document.getElementById('ledrange').addEventListener('change', iowrite);

    scanport();
}


// �V���A���|�[�g�̐ڑ��Ɛؒf 
var onConnect = false;

function connectPort() {
	if (!onConnect) {
		var selectedPort = select.childNodes[select.selectedIndex].value;
		document.getElementById('waitingicon').src="img/loading02_r2_c4.gif";

		myps.open(selectedPort, function (result) {
			if (result) {
				onConnect = true;
				select.disabled = true;
				document.getElementById('connect').value="Disconnect";
				document.getElementById('scanport').disabled = true;
				document.getElementById('config').disabled = false;

				document.getElementById('waitingicon').src="img/icon_ok_24x24.png";
			} else {
				document.getElementById('waitingicon').src="img/close03-001-24.png";
			}
		});
	} else {
		myps.close(function (result) {
			select.disabled = false;

			document.getElementById('connect').value="Connect";
			document.getElementById('scanport').disabled = false;
			document.getElementById('waitingicon').src="img/dummy_1x1.png";

			document.getElementById('config').disabled = true;
			document.getElementById('configicon').src="img/dummy_1x1.png";
			document.getElementById('sysid').innerHTML = "";

			document.getElementById('ledrange').disabled = true;

			onConnect = false;
	    });
	}
}


// FPGA�̃R���t�B�O���[�V���� 
function configSetup() {

	// SysID��\�� 
	var getsysid = function() {
		var address = 0x10000000;
		myps.avm.iord(address, 0, function(result, data) {
			if (result) {
				var str = " SYSID : 0x" + ("00000000" + data.toString(16)).slice(-8);
				document.getElementById('sysid').innerHTML = str;
			}
		});
	};

	// RBF��ǂݍ��� 
	var xhr = new XMLHttpRequest();
	xhr.open('GET', rbfurl, true);
	xhr.responseType = "arraybuffer";
	xhr.onload = function(e) {
		myps.upload(0, xhr.response, function (result) {
			if (result) {
				document.getElementById('configicon').src="img/icon_ok_24x24.png";
				document.getElementById('ledrange').disabled = false;
				getsysid();
			} else {
				document.getElementById('configicon').src="img/close03-001-24.png";
				document.getElementById('ledrange').disabled = true;
				document.getElementById('sysid').innerHTML = "";
			}
		});
	};
	xhr.abort = function(e) {
		document.getElementById('configicon').src="img/close03-001-24.png";
	};
	xhr.error = function(e) {
		document.getElementById('configicon').src="img/close03-001-24.png";
	};
	xhr.timeout = function(e) {
		document.getElementById('configicon').src="img/close03-001-24.png";
	};

	// ���s 
	document.getElementById('configicon').src="img/loading02_r2_c4.gif";
	xhr.send();
}


// �X���C�_�[����������l��PWM���W�X�^�ɏ������� 
function iowrite() {
	var address = 0x10000100;
	var data = parseInt(document.getElementById('ledrange').value);

	myps.avm.iowr(address, 0, data, function(result) {
	});
}


