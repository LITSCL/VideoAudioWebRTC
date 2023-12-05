const socket = require('socket.io');

var app = require('./app.js'); //En esta constante se almacena toda la configuración del servidor.

var puerto = 2900;

//Iniciando el servidor.
var server = app.listen(puerto, function() {
    console.log(`Servidor levantado correctamente en el puerto ${puerto}`);
});

//Actualizando el servidor para aceptar websockets. 
var io = socket(server);

//Se ejecuta para cuando un cliente está conectado. 
io.on("connection", function(socket) {
    console.log("El usuario con ID: " + socket.id + " se ha conectado al socket");
 
    //Se activa cuando un compañero pulsa el botón para unirse a la sala.
    socket.on("usuario-conectado", function(nombreSala) {
        var salas = io.sockets.adapter.rooms;
        var sala = io.sockets.adapter.rooms.get(nombreSala); //Al principio no hay nadie en la sala, por lo tanto es "undefined". Como no hay nadie no se puede conseguir.

        if (sala == undefined) { //Se consulta si la sala no existe, se crea.
            socket.join(nombreSala); //Se agrega el usuario a la sala.
            socket.emit("sala-creada");
        }
        else if (sala.size == 1) { //Se consulta si la sala ya esta creada, si esta creada simplemente se agrega al usuario.
            socket.join(nombreSala); //Se agrega el usuario a la sala.
            socket.emit("usuario-ingresado");
        }
        else {
            socket.emit("sala-llena");
        }     
        
        //Se ejecuta cuando es usuario se esta desconectado (Se ejecuta antes que el evento "disconnect"), es obligatorio que esté dentro del evento (connection).
        socket.on('disconnecting', function() { 
            let salasDelSocketArray = Array.from(socket.rooms); //Se obtienen todas los rooms a los cuales pertenece el socket (En este caso siempre pertenece a un solo room).
            let nombreSala = salasDelSocketArray[1];
            socket.broadcast.to(nombreSala).emit("salir", socket.id);
        });
    });

    //Se Ejecuta cuando la persona que se unió a la sala y está listo para comunicarse. 
    socket.on("listo", function(nombreSala) {
        console.log("Listo");
        socket.broadcast.to(nombreSala).emit("listo");
    });

    //Se activa cuando el servidor obtiene un IceCandidate de un Peer en la sala. 
    socket.on("candidato", function(candidato, nombreSala) {
        console.log("Candidato");
        socket.broadcast.to(nombreSala).emit("candidato", candidato);
    });

    //Se activa cuando el servidor recibe una oferta de un Peer en la sala.
    socket.on("oferta", function(oferta, nombreSala) {
        console.log("Oferta");
        socket.broadcast.to(nombreSala).emit("oferta", oferta);
    });

    //Se activa cuando el servidor recibe una oferta de un Peer en la sala. 
    socket.on("respuesta", function(respuesta, nombreSala) {
        console.log("Respuesta");
        socket.broadcast.to(nombreSala).emit("respuesta", respuesta);
    });

    //Se activa cuando un usuario da click en el botón "Salir".
    socket.on("salir", function(nombreSala) {
        socket.leave(nombreSala);
        socket.broadcast.to(nombreSala).emit("salir");
    });

    socket.on("disconnect", function() {
        console.log("El usuario con ID: " + this.id + " se ha desconectado al socket");
    });
});
