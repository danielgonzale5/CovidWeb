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
    console.log('Error: El servidor web no se pudo iniciar en el puerto establecido (' + port + ') ' + error);
  } else {
    console.log('El servidor web se inició correctamente en el puerto ' + port + '.');
  }
})

//Llamado de las variables de entorno y de librería MySQL para la Base de datos.
const mysql = require('mysql2');
var con = mysql.createConnection({
  host: "covidweb.cglibizn6is8.us-east-2.rds.amazonaws.com",
  user: "root",
  password: "covid12345",
  database: 'covidweb'
});

//Intento de conexión con la base de datos.
con.connect((err) => {
  if (err) {
    console.log('Hay un error de conexión con la base de datos')
  } else {
    console.log('La conexión con la base de datos funciona.')
  }
});

app.use(express.json({ limit: '200mb' }));

app.post('/login', function (req, res) {
  console.log("Enviando Validación de Login")
  console.log(req.body);
  var UsuData = req.body;
  var User = UsuData.user.toString();
  var Contra = UsuData.pass.toString();
  console.log(User, Contra);
  con.query("SELECT * FROM usuarios WHERE usuario = ('" + User + "') AND contraseña = ('" + Contra + "');", function (err, rows) {
    if (err) throw err;
    if (rows.length !=0) {
      var UData = JSON.parse(JSON.stringify(rows[0]))
      console.log(UData)
      console.log(parseInt(UData.rol))
      var VUsuRol = parseInt(UData.rol);
      var RolUsu = VUsuRol
    } else {
      var RolUsu = 4
    }
    io.emit('roluser', {
      RolUsu: RolUsu
    });
  });
});

app.post('/userinfo', function (req, res) {
  console.log("Enviando Validación de Usuario")
  console.log(req.body);
  var UsData = req.body;
  var Usu = UsData.datauser.toString();
  var Ced = UsData.datacedu.toString();
  con.query("SELECT * FROM usuarios WHERE usuario = ('" + Usu + "');", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      var UsInfChk = 1
    } else {
      var UsInfChk = 0
    }
    con.query("SELECT * FROM usuarios WHERE cedula = ('" + Ced + "');", function (err, rows) {
      if (err) throw err;
      if (rows.length != 0) {
        var CdInfChk = 1
      } else {
        var CdInfChk = 0
      }
      io.emit('userchecked', {
        UsInfChk: UsInfChk,
        CdInfChk: CdInfChk
      });
    });
  });
});

app.post('/regisinfo', function (req, res) {
  console.log("Registrando Usuario")
  console.log(req.body);
  var UsData = req.body;
  var Usu = UsData.datausuario.toString();
  var Pass = UsData.datacontra.toString();
  var Name = UsData.datanombre.toString();
  var LName = UsData.dataapellido.toString();
  var Rol = parseInt(UsData.datarol);
  var Cedu = parseFloat(UsData.datacedula.toString());
  var Imysql = "INSERT INTO usuarios (cedula, nombre, apellido, rol, usuario, contraseña) VALUES ?";
  var values = [[Cedu, Name, LName, Rol, Usu, Pass]];
  con.query(Imysql, [values], function (err, result) {
    if (err) throw err;
    console.log("Registro Insertado: " + result.affectedRows);
  });
});

app.post('/regis', function (req, res) {
  console.log("Anexando caso")
  console.log(req.body);
  var dataCase = req.body;
  var cedula_post = parseFloat(dataCase.cedula);
  var nombre_post = dataCase.nombre.toString();
  var apellido_post = dataCase.apellido.toString();
  var sexo_post = parseInt(dataCase.sexo);
  var fecha_nacimiento_post = dataCase.fecha_nacimiento.toString();
  var direccion_residencia_post = dataCase.direccion_residencia.toString();
  var direccion_trabajo_post = dataCase.direccion_trabajo.toString();
  var resultado_examen_post = parseInt(dataCase.resultado_examen);
  var fecha_examen_post = dataCase.fecha_examen.toString();

  var Imysql = "INSERT INTO registro_pacientes (cedula, nombre, apellido, sexo, fecha_nacimiento, dir_residencia, dir_trabajo, resultado, fecha_examen) VALUES ?";
  var values = [[cedula_post, nombre_post, apellido_post, sexo_post, fecha_nacimiento_post, direccion_residencia_post, direccion_trabajo_post, resultado_examen_post, fecha_examen_post]];
  con.query(Imysql, [values], function (err, result) {
    if (err) throw err;
    console.log("Registro Insertado: " + result.affectedRows);
  });

  con.query("SELECT * FROM registro_pacientes ORDER BY idcaso DESC LIMIT 1;", function (err, rows) {
    if (err) throw err;
    var CaseData = JSON.parse(JSON.stringify(rows[0]))
    var DataCase = CaseData.idcaso
    var Code = DataCase
    io.emit('coderegis', {
      Code: Code
    });
  });
});

app.post('/rcedinfo', function (req, res) {
  console.log("Enviando Validación de Cédula")
  console.log(req.body);
  var CdData = req.body;
  var Ced = CdData.datacedu.toString();
  con.query("SELECT * FROM registro_pacientes WHERE cedula = ('" + Ced + "');", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      var CedInfChk = 1;
    } else {
      var CedInfChk = 0;
    }
    io.emit('rceduchecked', {
      CedInfChk: CedInfChk
    });
  });
});

app.post('/cosltcheck1', function (req, res) {
  console.log("Chequeando nombre")
  console.log(req.body);
  var cedulcheck = req.body;
  var cedulachk = cedulcheck.cedulac.toString();
  con.query("SELECT * FROM registro_pacientes WHERE cedula = ('" + cedulachk + "');", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      var CedulaCChecked = 1;
    } else {
      var CedulaCChecked = 0;
    }
    io.emit('cedulchecked', {
      CedulaCChecked: CedulaCChecked
    });
  });
});

app.post('/cosltcheck2', function (req, res) {
  console.log("Chequeando nombre")
  console.log(req.body);
  var cdgcheck = req.body;
  var codgchk = cdgcheck.codigoc.toString();
  con.query("SELECT * FROM registro_pacientes WHERE idcaso = ('" + codgchk + "');", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      var CodigoCChecked = 1;
    } else {
      var CodigoCChecked = 0;
    }
    io.emit('codigchecked', {
      CodigoCChecked: CodigoCChecked
    });
  });
});

app.post('/cosltcheck3', function (req, res) {
  console.log("Chequeando nombre")
  console.log(req.body);
  var namecheck = req.body;
  var nombrechk = namecheck.nombrec.toString();
  var apellidochk = namecheck.apellidoc.toString();
  con.query("SELECT * FROM registro_pacientes WHERE apellido = ('" + apellidochk + "') AND nombre = ('" + nombrechk + "');", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      var NameChecked = 1;
    } else {
      var NameChecked = 0;
    }
    io.emit('namechecked', {
      NameChecked: NameChecked
    });
  });
});

app.post('/consulta1', function (req, res) {
  console.log("Consultando caso")
  console.log(req.body);
  var consult = req.body;
  var cstcedu = consult.ctcedu;
  con.query("SELECT * FROM registro_pacientes WHERE cedula = ('" + cstcedu + "') ;", function (err, rows) {
    if (err) throw err;
    var CeduData = JSON.parse(JSON.stringify(rows[0]))
    var CodigoCs = CeduData.idcaso.toString();
    var CedulaCs = CeduData.cedula.toString();
    var NombreCs = CeduData.nombre.toString();
    var ApellidoCs = CeduData.apellido.toString();
    var PreSexoCs = CeduData.sexo.toString();
    if (PreSexoCs == "0") {
      var SexoCs = "Masculino"
    } else if (PreSexoCs == "1") {
      var SexoCs = "Femenino"
    }
    var NacimientoCs = CeduData.fecha_nacimiento.split('T', 1)[0];
    var ResidenciaCs = CeduData.dir_residencia.toString();
    var TrabajoCs = CeduData.dir_trabajo.toString();
    var PreResultadoCs = CeduData.resultado.toString();
    if (PreResultadoCs == "0") {
      var ResultadoCs = "Positivo"
    } else if (PreResultadoCs == "1") {
      var ResultadoCs = "Negativo"
    }
    var FExaCs = CeduData.fecha_examen.split('T', 1)[0];

    io.emit('infocase', {
      CodigoCs: CodigoCs,
      CedulaCs: CedulaCs,
      NombreCs: NombreCs,
      ApellidoCs: ApellidoCs,
      SexoCs: SexoCs,
      NacimientoCs: NacimientoCs,
      ResidenciaCs: ResidenciaCs,
      TrabajoCs: TrabajoCs,
      ResultadoCs: ResultadoCs,
      FExaCs: FExaCs
    });
  });
  con.query("SELECT * FROM estado_pacientes WHERE cedula = ('" + cstcedu + "') ORDER BY fecha_mod DESC LIMIT 1;", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      var CeduData2 = JSON.parse(JSON.stringify(rows[0]))
      var EstadoCs = CeduData2.estado.toString()
    } else {
      var EstadoCs = "-";
    }
    var CeduData2 = JSON.parse(JSON.stringify(rows[0]))
    var EstadoCs = CeduData2.estado.toString()

    io.emit('estadocaso', {
      EstadoCs: EstadoCs,
    });
  });
  con.query("SELECT * FROM estado_pacientes WHERE cedula = ('" + cstcedu + "') ORDER BY fecha_mod DESC LIMIT 1;", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      io.emit('histcaso', rows);
    } else {
      io.emit('histcaso', "No se encontró información previa");
    }
  });
});

app.post('/consulta2', function (req, res) {
  console.log("Consultando caso")
  console.log(req.body);
  var consult = req.body;
  var cstcodigo = consult.ctcodigo;
  con.query("SELECT * FROM registro_pacientes WHERE idcaso = ('" + cstcodigo + "') ;", function (err, rows) {
    if (err) throw err;
    var CeduData = JSON.parse(JSON.stringify(rows[0]))
    var CodigoCs = CeduData.idcaso.toString();
    var CedulaCs = CeduData.cedula.toString();
    var NombreCs = CeduData.nombre.toString();
    var ApellidoCs = CeduData.apellido.toString();
    var PreSexoCs = CeduData.sexo.toString();
    if (PreSexoCs == "0") {
      var SexoCs = "Masculino"
    } else if (PreSexoCs == "1") {
      var SexoCs = "Femenino"
    }
    var NacimientoCs = CeduData.fecha_nacimiento.split('T', 1)[0];
    var ResidenciaCs = CeduData.dir_residencia.toString();
    var TrabajoCs = CeduData.dir_trabajo.toString();
    var PreResultadoCs = CeduData.resultado.toString();
    if (PreResultadoCs == "0") {
      var ResultadoCs = "Positivo"
    } else if (PreResultadoCs == "1") {
      var ResultadoCs = "Negativo"
    }
    var FExaCs = CeduData.fecha_examen.split('T', 1)[0];

    io.emit('infocase', {
      CodigoCs: CodigoCs,
      CedulaCs: CedulaCs,
      NombreCs: NombreCs,
      ApellidoCs: ApellidoCs,
      SexoCs: SexoCs,
      NacimientoCs: NacimientoCs,
      ResidenciaCs: ResidenciaCs,
      TrabajoCs: TrabajoCs,
      ResultadoCs: ResultadoCs,
      FExaCs: FExaCs
    });
  });
  con.query("SELECT * FROM estado_pacientes WHERE idcaso = ('" + cstcodigo + "') ORDER BY fecha_mod DESC LIMIT 1;", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      var CodeData2 = JSON.parse(JSON.stringify(rows[0]))
      var EstadoCs = CodeData2.estado.toString()
    } else {
      var EstadoCs = "-";
    }

    io.emit('estadocaso', {
      EstadoCs: EstadoCs,
    });
  });
  con.query("SELECT * FROM estado_pacientes WHERE idcaso = ('" + cstcodigo + "') ORDER BY fecha_mod DESC LIMIT 1;", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      io.emit('histcaso', rows);
    } else {
      io.emit('histcaso', "No se encontró información previa");
    }
  });
});

app.post('/consulta3', function (req, res) {
  console.log("Consultando caso")
  console.log(req.body);
  var consult = req.body;
  var cstnombre = consult.ctnombre;
  var cstapellido = consult.ctapellido;
  con.query("SELECT * FROM registro_pacientes WHERE nombre = ('" + cstnombre + "') AND apellido = ('" + cstapellido + "');", function (err, rows) {
    if (err) throw err;
    var CeduData = JSON.parse(JSON.stringify(rows[0]))
    var CodigoCs = CeduData.idcaso.toString();
    var CedulaCs = CeduData.cedula.toString();
    var NombreCs = CeduData.nombre.toString();
    var ApellidoCs = CeduData.apellido.toString();
    var PreSexoCs = CeduData.sexo.toString();
    if (PreSexoCs == "0") {
      var SexoCs = "Masculino"
    } else if (PreSexoCs == "1") {
      var SexoCs = "Femenino"
    }
    var NacimientoCs = CeduData.fecha_nacimiento.split('T', 1)[0];
    var ResidenciaCs = CeduData.dir_residencia.toString();
    var TrabajoCs = CeduData.dir_trabajo.toString();
    var PreResultadoCs = CeduData.resultado.toString();
    if (PreResultadoCs == "0") {
      var ResultadoCs = "Positivo"
    } else if (PreResultadoCs == "1") {
      var ResultadoCs = "Negativo"
    }
    var FExaCs = CeduData.fecha_examen.split('T', 1)[0];

    io.emit('infocase', {
      CodigoCs: CodigoCs,
      CedulaCs: CedulaCs,
      NombreCs: NombreCs,
      ApellidoCs: ApellidoCs,
      SexoCs: SexoCs,
      NacimientoCs: NacimientoCs,
      ResidenciaCs: ResidenciaCs,
      TrabajoCs: TrabajoCs,
      ResultadoCs: ResultadoCs,
      FExaCs: FExaCs
    });
  });
  con.query("SELECT * FROM estado_pacientes WHERE nombre = ('" + cstnombre + "') AND apellido = ('" + cstapellido + "') ORDER BY fecha_mod DESC LIMIT 1;", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      var NameData2 = JSON.parse(JSON.stringify(rows[0]))
      var EstadoCs = NameData2.estado.toString()
    } else {
      var EstadoCs = "-";
    }

    io.emit('estadocaso', {
      EstadoCs: EstadoCs,
    });
  });
  con.query("SELECT * FROM estado_pacientes WHERE nombre = ('" + cstnombre + "') AND apellido = ('" + cstapellido + "') ORDER BY fecha_mod DESC LIMIT 1;", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      io.emit('histcaso', rows);
    } else {
      io.emit('histcaso', "No se encontró información previa");
    }
  });
});
