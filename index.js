import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

const app = express();


// Conexión a la base de datos MongoDB
mongoose.connect("mongodb://localhost:27017/Ecommerce", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.on("error", (err) => {
  console.error("Error de conexión a MongoDB:", err);
});

db.once("open", () => {
  console.log("Conexión a MongoDB exitosa");
});

// Define el modelo de usuario en Mongoose
const userSchema = new mongoose.Schema({
  nombre: String,
  apellido: String,
  correo_electronico: String,
  contrasena: String,
  productos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
    },
  ],
});

const User = mongoose.model('User', userSchema);


// Define el modelo de producto en Mongoose
const productoSchema = new mongoose.Schema({
  nombre: String,
  marca: String,
  descripcion: String,
  precio: Number,
  stock: Number,
  tipo: String,
  imagen_url: String,
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  comentarios: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comentario'
  },
  compras: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Compra'
  },
});

const Producto = mongoose.model('Producto', productoSchema);


// Define el modelo de comentario en Mongoose
const comentarioSchema = new mongoose.Schema({
  texto: String,
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto', 
  },
  nombre: String,
  fecha: {
    type: Date,
    default: Date.now,
  },
});

const Comentario = mongoose.model('Comentario', comentarioSchema);

// Define el modelo de compra en Mongoose
const compraSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  productos: [
    {
      producto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
      },
      cantidad: Number, 
    },
  ],
  total: Number,
  pais: String,
  provincia: String,
  localidad: String,
  calle: String,
  telefono: Number,
  numero_tarjeta: Number,
  numero_seguridad: Number,
  fecha: {
    type: Date,
    default: Date.now,
  },
});

const Compra = mongoose.model('Compra', compraSchema);


// Configuración de Passport para autenticación local
passport.use(
  new LocalStrategy(
    {
      usernameField: "correo_electronico",
      passwordField: "contrasena",
    },
    async (correo_electronico, contrasena, done) => {
      try {
        const user = await User.findOne({ correo_electronico }).exec();

        if (!user || user.contrasena !== contrasena) {
          return done(null, false, { message: "Credenciales inválidas" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

const corsOptions = {
  origin: 'https://mercadoexpress-front.netlify.app/', // Reemplaza con la URL de tu aplicación de Netlify
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};

app.use(cors(corsOptions));


app.use(express.json());
app.use(cors());
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Método sección inicio
app.get("/", async (req, res) => {
  try {
    const productos = await Producto.find({});
    return res.json(productos);
  } catch (err) {
    return res.status(500).json({ error: "Error en la base de datos", details: err.message });
  }
});

// Método sección busqueda de productos según el tipo
app.get("/productos/:tipo", async (req, res) => {
  const tipo = req.params.tipo;

  try {
    // Utiliza el método find de Mongoose para buscar productos por tipo
    const productos = await Producto.find({ tipo }).exec();
    return res.json(productos);
  } catch (err) {
    return res.status(500).json({ error: "Error en la base de datos", details: err.message });
  }
});

// Método sección busqueda del producto segun el id
app.get("/productos/detalle/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const productId = new mongoose.Types.ObjectId(id); 

    const producto = await Producto.findOne({ _id: productId }).exec();

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.json(producto);
  } catch (err) {
    return res.status(500).json({ error: "Error en la base de datos", details: err.message });
  }
});

// Método de busqueda de comentarios según el id
app.get('/productos/comentarios/:id', async (req, res) => {
  const productoId = req.params.id;

  try {
    const comentarios = await Comentario.find({ producto: productoId }).populate('usuario').exec();

    if (!comentarios) {
      return res.status(404).json({ error: 'Comentarios no encontrados' });
    }

    return res.json(comentarios);
  } catch (err) {
    return res.status(500).json({ error: 'Error en la base de datos', details: err.message });
  }
});

// Método para agregar productos
app.post("/agregarProductos", async (req, res) => {
  const {
    nombre,
    marca,
    descripcion,
    precio,
    stock,
    tipo,
    imagen_url,
  } = req.body;

  try {
    const nuevoProducto = new Producto({
      nombre,
      marca,
      descripcion,
      precio,
      stock,
      tipo,
      imagen_url,
    });

    await nuevoProducto.save();

    return res.json("Producto creado!!!");
  } catch (err) {
    console.error("Error al guardar el producto:", err);
    return res
      .status(500)
      .json({ error: "Error en la base de datos", details: err.message });
  }
});

// Método de registro
app.post("/registro", async (req, res, next) => {
  const { nombre, apellido, correo_electronico, contrasena } = req.body;

  try {
    const newUser = new User({
      nombre,
      apellido,
      correo_electronico,
      contrasena,
    });

    await newUser.save();

    passport.authenticate("local")(req, res, () => {
      return res.json({ message: "Usuario registrado!" });
    });
  } catch (err) {
    return next(err);
  }
});

// Método login
app.post("/login", (req, res, next) => {
  const { correo_electronico, contrasena } = req.body;

  if (!correo_electronico || !contrasena) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      return res.json({ message: "Inicio de sesión exitoso", usuario: user });
    });
  })(req, res, next);
});

// Método para agregar comentarios
app.post('/productos/comentarios/agregar', async (req, res) => {
  const { texto, usuarioId, productoId, nombre } = req.body;

  try {
    const nuevoComentario = new Comentario({
      texto,
      usuario: usuarioId,
      producto: productoId,
      nombre: nombre,
    });

    await nuevoComentario.save();

    return res.json('Comentario agregado');
  } catch (err) {
    console.error('Error al guardar el comentario:', err);
    return res.status(500).json({ error: 'Error en la base de datos', details: err.message });
  }
});


// Método para actualizar el producto
app.put("/productos/actualizarProducto/:id", async (req, res) => {
  const productId = req.params.id;
  const { nombre, marca, descripcion, precio, stock, tipo, imagen_url } = req.body;

  try {
    const updatedProduct = await Producto.findByIdAndUpdate(
      productId,
      {
        nombre,
        marca,
        descripcion,
        precio,
        stock,
        tipo,
        imagen_url,
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.json("Producto actualizado!");
  } catch (err) {
    console.error("Error en la actualización:", err);
    return res.status(500).json({ error: "Error en la base de datos", details: err.message });
  }
});

// Método para borrar un producto
app.delete("/productos/borrarProducto/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    const result = await Producto.deleteOne({ _id: productId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.json("Producto eliminado!");
  } catch (err) {
    return res.status(500).json({ error: "Error en la base de datos", details: err.message });
  }
});

// Endpoint para realizar una compra
app.post("/comprar", async (req, res) => {
  const { productId, pais, provincia, localidad, calle, telefono, numero_tarjeta, numero_seguridad } = req.body;
  const usuarioId = User._id;

  try {
    const product = await Producto.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    if (product.stock === 0) {
      return res.status(400).json({ error: "Producto agotado" });
    }

    product.stock -= 1;
    await product.save();

    const compra = new Compra({
      usuario: usuarioId,
      productos: [{ producto: productId, cantidad: 1 }], 
      pais: pais, 
      provincia: provincia, 
      localidad: localidad, 
      calle: calle, 
      telefono: telefono, 
      numero_tarjeta: numero_tarjeta, 
      numero_seguridad: numero_seguridad, 
      total: product.precio, 
    });

    await compra.save();

    return res.json({ message: "Compra exitosa, stock actualizado", producto: product });
  } catch (err) {
    return res.status(500).json({ error: "Error en la base de datos", details: err.message });
  }
});

app.listen(8800, () => {
  console.log("Backend conectado");
});