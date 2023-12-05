var socket = io.connect("", {"forceNew": true});
socket.on("connect", () => {
    const idSocketLocal = socket.id;

    var div_lobby = document.getElementById("lobby");
    var div_sala = document.getElementById("sala");
    var button_ingresar = document.getElementById("ingresar");
    var video_videoLocal = document.getElementById("videoLocal");
    var video_videoPeer = document.getElementById("videoPeer");
    var input_nombreSala = document.getElementById("nombreSala");
    
    var div_menuBoton = document.getElementById("menuBoton");
    var button_botonMicrofono = document.getElementById("botonMicrofono");
    var button_botonCamara = document.getElementById("botonCamara");
    var button_botonSalir = document.getElementById("botonSalir");
    var i_microfono = document.getElementById("microfono");
    var i_camara = document.getElementById("camara");
    var i_salir = document.getElementById("salir");
    
    var microfonoApagado = false;
    var camaraApagada = false;
    var nombreSala = input_nombreSala.value;
    var creador = false;
    var rtcPeerConnection;
    var streamUsuario;
    
    //Contiene la URL del servidor de aturdimiento que se usará mas adelante. 
    var iceServers = {
        iceServers: [
            {urls: "stun:stun.services.mozilla.com"},
            {urls: "stun:stun.l.google.com:19302"},
        ]
    };
    
    button_ingresar.addEventListener("click", function() {
        if (input_nombreSala.value == "") {
            alert("Por favor ingresa un nombre de sala");
        }
        else {
            nombreSala = input_nombreSala.value;
            socket.emit("usuario-conectado", nombreSala);
        }
    });
    
    //Se ejecuta cuando se crea una sala con éxito. 
    socket.on("sala-creada", function() {
        creador = true;

        console.log("Eres el creador de la sala: " + idSocketLocal);
    
        navigator.mediaDevices.getUserMedia({
            audio: true, 
            video: {width: 500, height: 280},
        })
        .then(function(stream) {
            div_lobby.style = "display: none";
            div_sala.style = "display: flex";
            div_menuBoton.style = "display: block";
            streamUsuario = stream; 
            video_videoLocal.srcObject = stream;
            video_videoLocal.onloadedmetadata = function(e) {
            video_videoLocal.play();
            }
        })
        .catch(function(error) {
            alert("Error al acceder al hardware");
        });
    });
    
    //Se ejecuta cuando un Peer se une correctamente a la sala. 
    socket.on("usuario-ingresado", function() {
        creador = false;
        
        console.log("Eres el segundo conectado de la sala: " + idSocketLocal);

        navigator.mediaDevices.getUserMedia({
            audio: true, 
            video: {width: 500, height: 280},
        })
        .then(function(stream) {
            div_lobby.style = "display: none";
            div_sala.style = "display: flex";
            div_menuBoton.style = "display: block";
            streamUsuario = stream; 
            video_videoLocal.srcObject = stream;
            video_videoLocal.onloadedmetadata = function(e) {
                video_videoLocal.play();
            }
            socket.emit("listo", nombreSala);
        })
        .catch(function(error) {
            console.log(error);
            alert("Error al acceder al hardware");
        });
    });
    
    //Se ejecuta cuando una sala está llena (Es decir, tiene 2 personas). 
    socket.on("sala-llena", function() {
        alert("La sala esta llena, no puedes entrar");
    });
    
    //Se ejecuta cuando un Peer se ha unido a la sala y está listo para comunicarse. 
    socket.on("listo", function() {
        if (creador == true) {
            console.log("Ofertando...");
            rtcPeerConnection = new RTCPeerConnection(iceServers); //La interfaz RTCPeerConnection, representa la conexión entre el usuario remoto (Necesitamos entregarle el servidor de hielo del otro usuario).
            rtcPeerConnection.onicecandidate = onIceCandidate;
            rtcPeerConnection.ontrack = onTrack;
            rtcPeerConnection.addTrack(streamUsuario.getTracks()[0], streamUsuario); //Esta instrucción representa la pista de audio.
            rtcPeerConnection.addTrack(streamUsuario.getTracks()[1], streamUsuario); //Esta instrucción representa la pista de video.
            rtcPeerConnection.createOffer(function(oferta) {
                rtcPeerConnection.setLocalDescription(oferta);
                socket.emit("oferta", oferta, nombreSala);
            }, function(error) {
                console.log(error);
            });
        }
    });
    
    //Se ejecuta al recibir un IceCandidate de un Peer. 
    socket.on("candidato", function(candidato) {
        let iceCandidate = new RTCIceCandidate(candidato);
        rtcPeerConnection.addIceCandidate(iceCandidate);
    });
    
    //Se ejecuta al recibir una oferta de la persona que creó la sala. 
    socket.on("oferta", function(oferta) {
        if (creador == false) {
            console.log("Respondiendo...");
            rtcPeerConnection = new RTCPeerConnection(iceServers);
            rtcPeerConnection.onicecandidate = onIceCandidate;
            rtcPeerConnection.ontrack = onTrack;
            rtcPeerConnection.addTrack(streamUsuario.getTracks()[0], streamUsuario); //Esta instrucción representa la pista de audio.
            rtcPeerConnection.addTrack(streamUsuario.getTracks()[1], streamUsuario); //Esta instrucción representa la pista de video.
            rtcPeerConnection.setRemoteDescription(oferta);
            rtcPeerConnection.createAnswer(function(respuesta) {
                rtcPeerConnection.setLocalDescription(respuesta);
                socket.emit("respuesta", respuesta, nombreSala);
            }, function(error) {
                console.log(error);
            });
        }
    });
    
    //Se activa al recibir una respuesta del usuario que se unió a la sala. 
    socket.on("respuesta", function(respuesta) {
        rtcPeerConnection.setRemoteDescription(respuesta);
    });
    
    //Implementación de OnIceCandidateFunction, que es parte de la interfaz RTCPeerConnection. 
    function onIceCandidate(evento) {
        if (evento.candidate) {
            socket.emit("candidato", evento.candidate, nombreSala);
        }
    }
    
    //Implementación de OnTrackFunction, que es parte de la interfaz RTCPeerConnection. 
    function onTrack(evento) {
        video_videoPeer.style.setProperty("display", "block"); //Aquí se debe hacer visible el contenedor del Peer que se acaba de conectar (En caso de que no sea visible por que se conecta por segunda vez).
        video_videoPeer.srcObject = evento.streams[0];
        video_videoPeer.onloadedmetadata = function(e) {
            video_videoPeer.play();
        }
    }
    
    button_botonMicrofono.addEventListener("click", function() {
        microfonoApagado = !microfonoApagado;
        if (microfonoApagado) {
            streamUsuario.getTracks()[0].enabled = false; //Desactivando audio.
            i_microfono.setAttribute("class", "fas fa-microphone-slash");
        }
        else {
            streamUsuario.getTracks()[0].enabled = true;
            i_microfono.setAttribute("class", "fas fa-microphone");
        }
    });
    
    button_botonCamara.addEventListener("click", function() {
        camaraApagada = !camaraApagada;
        if (camaraApagada) {
            streamUsuario.getTracks()[1].enabled = false; //Desactivando video.
            i_camara.setAttribute("class", "fas fa-video-slash");
        }
        else {
            streamUsuario.getTracks()[1].enabled = true;
            i_camara.setAttribute("class", "fas fa-video");
        }
    });
    
    button_botonSalir.addEventListener("click", function() {
        socket.emit("salir", nombreSala);
        div_lobby.style = "display: block";
        div_sala.style = "display: none";
        div_menuBoton.style = "display: none";
        
        if (video_videoLocal.srcObject) {
            video_videoLocal.srcObject.getTracks()[0].stop(); //Aquí se deja de recibir la pista de audio del usuario.
            video_videoLocal.srcObject.getTracks()[1].stop(); //Aquí se deja de recibir la pista de video del usuario.
        }
    
        if (video_videoPeer.srcObject) {
            video_videoPeer.srcObject.getTracks()[0].stop(); //Aquí se deja de recibir la pista de audio del Peer.
            video_videoPeer.srcObject.getTracks()[1].stop(); //Aquí se deja de recibir la pista de video del Peer.
        }
    
        //Comprueba si hay un Peer en el otro lado y cierra de forma segura la conexión existente establecida con el Peer. 
        if (rtcPeerConnection) {
            rtcPeerConnection.onTrack = null;
            rtcPeerConnection.onicecandidate = null;
            rtcPeerConnection.close();
            rtcPeerConnection = null;
        }
    });
    
    //Se ejecuta cuando el otro Peer de la sala ha abandonado la sala. 
    socket.on("salir", function() {
        creador = true; //Este usuario ahora es creador porque es el único en la sala.
        video_videoPeer.style.setProperty("display", "none");
        
        //Cierra de forma segura la conexión existente establecida con el Peer que se fue. 
        if (rtcPeerConnection) {
            rtcPeerConnection.onTrack = null;
            rtcPeerConnection.onicecandidate = null;
            rtcPeerConnection.close();
            rtcPeerConnection = null;
        }
    
        if (video_videoPeer.srcObject) {
            video_videoPeer.srcObject.getTracks()[0].stop();
            video_videoPeer.srcObject.getTracks()[1].stop();
        }
    });
});


