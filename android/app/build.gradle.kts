plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val repoRoot = rootProject.projectDir.parentFile
val generatedWebAssets = layout.buildDirectory.dir("generated/web-assets")

val prepareWebAssets = tasks.register("prepareWebAssets") {
    description = "Build the Vite web app and copy dist/ into Android assets."
    val packageJson = repoRoot.resolve("package.json")
    val srcDir = repoRoot.resolve("src")
    val publicDir = repoRoot.resolve("public")
    inputs.file(packageJson)
    inputs.dir(srcDir)
    inputs.dir(publicDir)
    outputs.dir(generatedWebAssets)

    doLast {
        val npm = if (System.getProperty("os.name").lowercase().contains("windows")) "npm.cmd" else "npm"
        val nodeModules = repoRoot.resolve("node_modules")
        if (!nodeModules.isDirectory) {
            exec {
                workingDir = repoRoot
                commandLine(npm, "install")
            }
        }
        exec {
            workingDir = repoRoot
            commandLine(npm, "run", "build")
        }

        val dest = generatedWebAssets.get().asFile.resolve("www")
        dest.deleteRecursively()
        dest.mkdirs()
        val dist = repoRoot.resolve("dist")
        if (!dist.isDirectory) {
            throw GradleException("Vite dist/ is missing after npm run build")
        }
        dist.copyRecursively(dest, overwrite = true)
    }
}

android {
    namespace = "com.markemcallister.publiccameras"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.markemcallister.publiccameras"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = false
    }

    androidResources {
        noCompress += listOf("html", "htm", "css", "js", "json", "svg", "webmanifest")
    }

    sourceSets {
        getByName("main") {
            assets.srcDirs(
                "src/main/assets",
                generatedWebAssets,
            )
        }
    }
}

tasks.named("preBuild").configure {
    dependsOn(prepareWebAssets)
}

afterEvaluate {
    tasks.matching { it.name.startsWith("merge") && it.name.endsWith("Assets") }.configureEach {
        dependsOn(prepareWebAssets)
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.2")
    implementation("androidx.webkit:webkit:1.11.0")
}
