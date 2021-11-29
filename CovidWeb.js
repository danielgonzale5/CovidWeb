//Inicialización de Variables Globales y definición de librerías importantes
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
  console.log("Chequeando cedula")
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
      var Estado = CeduData2.estado.toString()
      if (Estado == "1") {
        var EstadoCs = "En Tratamiento Hospital";
      } else if (Estado == "2") {
        var EstadoCs = "En UCI";
      } else if (Estado == "3") {
        var EstadoCs = "Curado";
      } else if (Estado == "6") {
        var EstadoCs = "Muerte";
      } else if (Estado == "5") {
        var EstadoCs = "Sano";
      } else if (Estado == "4") {
        var EstadoCs = "En Tratamiento Casa";
      }
    } else {
      var EstadoCs = "-";
    }

    io.emit('estadocaso', {
      EstadoCs: EstadoCs,
    });
  });
  con.query("SELECT * FROM estado_pacientes WHERE cedula = ('" + cstcedu + "') ORDER BY fecha_mod;", function (err, rows) {
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
      var Estado = CodeData2.estado.toString()
      if (Estado == "1") {
        var EstadoCs = "En Tratamiento Hospital";
      } else if (Estado == "2") {
        var EstadoCs = "En UCI";
      } else if (Estado == "3") {
        var EstadoCs = "Curado";
      } else if (Estado == "6") {
        var EstadoCs = "Muerte";
      } else if (Estado == "5") {
        var EstadoCs = "Sano";
      } else if (Estado == "4") {
        var EstadoCs = "En Tratamiento Casa";
      }
    } else {
      var EstadoCs = "-";
    }

    io.emit('estadocaso', {
      EstadoCs: EstadoCs,
    });
  });
  con.query("SELECT * FROM estado_pacientes WHERE idcaso = ('" + cstcodigo + "') ORDER BY fecha_mod;", function (err, rows) {
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
  con.query("SELECT estado, fecha_mod FROM estado_pacientes AS epa, registro_pacientes AS rpa \
              WHERE rpa.nombre = ('" + cstnombre + "') AND rpa.apellido = ('" + cstapellido + "') AND epa.cedula = rpa.cedula \
              ORDER BY epa.fecha_mod DESC LIMIT 1;", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      var NameData2 = JSON.parse(JSON.stringify(rows[0]))
      var Estado = NameData2.estado.toString()
      if (Estado == "1") {
        var EstadoCs = "En Tratamiento Hospital";
      } else if (Estado == "2") {
        var EstadoCs = "En UCI";
      } else if (Estado == "3") {
        var EstadoCs = "Curado";
      } else if (Estado == "6") {
        var EstadoCs = "Muerte";
      } else if (Estado == "5") {
        var EstadoCs = "Sano";
      } else if (Estado == "4") {
        var EstadoCs = "En Tratamiento Casa";
      }
    } else {
      var EstadoCs = "-";
    }

    io.emit('estadocaso', {
      EstadoCs: EstadoCs,
    });
  });
  con.query("SELECT estado, fecha_mod FROM estado_pacientes AS epa, registro_pacientes AS rpa \
              WHERE rpa.nombre = ('" + cstnombre + "') AND rpa.apellido = ('" + cstapellido + "') AND epa.cedula = rpa.cedula \
              ORDER BY epa.fecha_mod;", function (err, rows) {
    if (err) throw err;
    if (rows.length != 0) {
      io.emit('histcaso', rows);
    } else {
      io.emit('histcaso', "No se encontró información previa");
    }
  });
});
app.post('/actestate', function (req, res) {
  console.log("Registrando Actualización")
  console.log(req.body);
  var AcData = req.body;
  var PSta = AcData.actestado.toString();
  if (PSta == "En Tratamiento Hospital") {
    var Sta = 1;
  } else if (PSta == "En UCI") {
    var Sta = 2;
  } else if (PSta == "Curado") {
    var Sta = 3;
  } else if (PSta == "Muerte") {
    var Sta = 6;
  } else if (PSta == "Sano") {
    var Sta = 5;
  } else if (PSta == "En Tratamiento Casa") {
    var Sta = 4;
  }
  var Acd = parseFloat(AcData.actcedu);
  var Acg = parseInt(AcData.actcode);
  var Afm = AcData.actfemod.toString();
  var Imysql = "INSERT INTO estado_pacientes (cedula, idcaso, estado, fecha_mod) VALUES ?";
  var values = [[Acd, Acg, Sta, Afm]];
  con.query(Imysql, [values], function (err, result) {
    if (err) throw err;
    console.log("Registro Insertado: " + result.affectedRows);
  });



});

app.post('/Mapdraw1',(req,err)=>{
  console.log('Cargando búsqueda')
  console.log(req.body)
  ctcedu=req.body.cedulac;
  
  con.query("select rp.cedula, rp.dir_residencia, rp.dir_trabajo, r.resultados "+
  "from registro_pacientes as rp, resultados r "+
  "where rp.resultado=r.idresultados and cedula = ('"+ctcedu+"')",(err,rows)=>{
    if (err) throw err;
    io.emit('mapa',rows)

  })

  con.query("SELECT r.resultados, rp.fecha_examen FROM registro_pacientes as rp, resultados r WHERE rp.cedula = ('" + ctcedu + "')and rp.resultado=r.idresultados ORDER BY fecha_examen;",(err, rows)=> {
    if (err) throw err;
    if (rows.length != 0) {
      io.emit('examen', rows);
    } else {
      io.emit('examen', "No se encontró información previa");
    }
  })
  con.query("SELECT * FROM estado_pacientes WHERE cedula = ('" + ctcedu + "') ORDER BY fecha_mod;",(err, rows)=> {
    if (err) throw err;
    if (rows.length != 0) {
      io.emit('histcaso2', rows);
    } else {
      io.emit('histcaso2', "No se encontró información previa");
    }
  })
  

});

app.post('/Mapdraw2',(req,err)=>{
  console.log('Cargando búsqueda')
  console.log(req.body)
  ctcodigo=req.body.codigoc;
  
  con.query("select rp.idcaso, rp.dir_residencia, rp.dir_trabajo, r.resultados "+
  "from registro_pacientes as rp, resultados r "+
  "where rp.resultado=r.idresultados and idcaso = ('"+ctcodigo+"')",(err,rows)=>{
    if (err) throw err;
    io.emit('mapa',rows)

  })
  con.query("SELECT r.resultados, rp.fecha_examen FROM registro_pacientes as rp, resultados r WHERE rp.idcaso = ('" + ctcodigo + "')and rp.resultado=r.idresultados ORDER BY fecha_examen;",(err, rows)=> {
    if (err) throw err;
    if (rows.length != 0) {
      io.emit('examen', rows);
    } else {
      io.emit('examen', "No se encontró información previa");
    }
  })
  con.query("SELECT * FROM estado_pacientes WHERE idcaso = ('" + ctcodigo + "') ORDER BY fecha_mod;",(err, rows)=> {
    if (err) throw err;
    if (rows.length != 0) {
      io.emit('histcaso2', rows);
    } else {
      io.emit('histcaso2', "No se encontró información previa");
    }
  })
  

});

app.post('/resumen', ()=>{

  con.query("SELECT CASE "+
    "WHEN numero=0 THEN date_format(curdate(), "+"'%a'"+") WHEN numero=1 THEN date_format(curdate()-1, "+"'%a'"+") "+
    "WHEN numero=2 THEN date_format(curdate()-2, "+"'%a'"+") WHEN numero=3 THEN date_format(curdate()-3, "+"'%a'"+") "+
    "WHEN numero=4 THEN date_format(curdate()-4, "+"'%a'"+") WHEN numero=5 THEN date_format(curdate()-5, "+"'%a'"+") "+
    "WHEN numero=6 THEN date_format(curdate()-6, "+"'%a'"+") END AS día, CASE "+
    "WHEN numero=0 THEN (SELECT COUNT(cedula) FROM registro_pacientes WHERE fecha_examen=current_date()) "+
    "WHEN numero=1 THEN (SELECT COUNT(cedula) FROM registro_pacientes WHERE fecha_examen=current_date()-1) "+
    "WHEN numero=2 THEN (SELECT COUNT(cedula) FROM registro_pacientes WHERE fecha_examen=current_date()-2) "+
    "WHEN numero=3 THEN (SELECT COUNT(cedula) FROM registro_pacientes WHERE fecha_examen=current_date()-3) "+
    "WHEN numero=4 THEN (SELECT COUNT(cedula) FROM registro_pacientes WHERE fecha_examen=current_date()-4) "+
    "WHEN numero=5 THEN (SELECT COUNT(cedula) FROM registro_pacientes WHERE fecha_examen=current_date()-5) "+
    "WHEN numero=6 THEN (SELECT COUNT(cedula) FROM registro_pacientes WHERE fecha_examen=current_date()-6) "+
    "END AS num_pacientes, CASE WHEN numero=0 THEN curdate() WHEN numero=1 THEN curdate()-1 WHEN numero=2 THEN curdate()-2 "+
    "WHEN numero=3 THEN curdate()-3 WHEN numero=4 THEN curdate()-4 WHEN numero=5 THEN curdate()-5 WHEN numero=6 THEN curdate()-6 "+
    "END AS fechacom FROM conteo",(err,rows)=>{
    if (err) throw err;
    io.emit('resum',rows)
  })


});

app.post('/general_map',(req,err)=>{
  con.query("SELECT  ep.idregistro_estado, ep.idcaso, ep.estado, rp.dir_residencia FROM estado_pacientes as ep, registro_pacientes as rp "+
  "where ep.idregistro_estado in (select max(idregistro_estado) FROM estado_pacientes group by idcaso) and ep.idcaso=rp.idcaso "+
  "order by idregistro_estado desc",(err,rows)=>{
    if (err) throw err;
    io.emit("pos",rows)
  })
  con.query("SELECT idcaso,cedula, resultado, dir_residencia FROM covidweb.registro_pacientes "+
  "where resultado=0 and cedula  not in (select cedula from covidweb.estado_pacientes) "+
  "group by cedula",(err,rows)=>{
    if (err) throw err;
    io.emit("neg",rows)
  })



});