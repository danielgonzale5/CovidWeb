//Inicialización de Variables Globales y definición de librerías importantes.
const express = require('express');
var app = require('express')();
var server = require('http').createServer(app);
var systemchild = require("child_process");
const port = 3000;
var dir = __dirname;
var io = require('socket.io')(server);
io.setMaxListeners(0);

//Método post, para ejecutar automáticamente un "-git pull" cuando se detecta un "PUSH" en el repositorio remoto.
app.post('/github', function (req, res) {  
  systemchild.exec("cd /home/ubuntu/LocateCabs && git reset --hard && git pull");
  console.log("GIT PULL realizado exitosamente.");
  res.end("");
});


//Definición de rutas o URL's del servidor web y de algunos archivos necesarios.
app.get('/', function (req, res) {
  res.sendFile(dir + '/PrincipalPage.html');
});
app.get('/PrincipalPage.css', function (req, res) {
  res.sendFile(dir + '/PrincipalPage.css');
});
app.get('/PrincipalPageAdmin', function (req, res) {
  res.sendFile(dir + '/PrincipalPageAdmin.html');
});
app.get('/PrincipalPageAdmin.css', function (req, res) {
  res.sendFile(dir + '/PrincipalPageAdmin.css');
});
app.get('/PrincipalPageAyudante', function (req, res) {
  res.sendFile(dir + '/PrincipalPageAyudante.html');
});
app.get('/PrincipalPageAyudante.css', function (req, res) {
  res.sendFile(dir + '/PrincipalPageAyudante.css');
});
app.get('/PrincipalPageMedico', function (req, res) {
  res.sendFile(dir + '/PrincipalPageMedico.html');
});
app.get('/PrincipalPageMedico.css', function (req, res) {
  res.sendFile(dir + '/PrincipalPageMedico.css');
});
app.get('/Administracion', function (req, res) {
    res.sendFile(dir + '/Administracion.html');
});
app.get('/Administracion.css', function (req, res) {
    res.sendFile(dir + '/Administracion.css');
});
app.get('/Registros', function (req, res) {
    res.sendFile(dir + '/Registros.html');
});
app.get('/Registros.css', function (req, res) {
    res.sendFile(dir + '/Registros.css');
});
app.get('/Gestion', function (req, res) {
    res.sendFile(dir + '/Gestion.html');
});
app.get('/Gestion.css', function (req, res) {
    res.sendFile(dir + '/Gestion.css');
});
app.get('/Busqueda', function (req, res) {
    res.sendFile(dir + '/Busqueda.html');
});
app.get('/Busqueda.css', function (req, res) {
    res.sendFile(dir + '/Busqueda.css');
});
app.get('/MapaGeneral', function (req, res) {
    res.sendFile(dir + '/MapaGeneral.html');
});
app.get('/MapaGeneral.css', function (req, res) {
    res.sendFile(dir + '/MapaGeneral.css');
});


//Conexión al puerto del servidor web basado en Javascript.
server.listen(port, function (error) {
  if (error) {
    console.log('Error: El servidor web no se pudo iniciar en el puerto establecido (' + port +') ' + error);
  } else {
    console.log('El servidor web se inició correctamente en el puerto ' + port + '.');
  }
})

//Llamado de las variables de entorno y de librería MySQL para la Base de datos.
//const mysql = require('mysql');
//var con = mysql.createConnection({
//  host: ,
//  user: ,
//  password: ,
// database: 'covidweb'
//});

//Intento de conexión con la base de datos.
//con.connect((err) => {
//  if (err) {
//    console.log('Hay un error de conexión con la base de datos')
//  } else {
//    console.log('La conexión con la base de datos funciona.')
//  }
//})