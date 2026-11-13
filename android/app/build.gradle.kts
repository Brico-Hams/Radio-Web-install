plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "org.bricohams.radio"
    compileSdk = 35
    defaultConfig {
        applicationId = "org.bricohams.radicodex"
        minSdk = 26
        targetSdk = 35
        versionCode = 18
        versionName = "1.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    buildFeatures { buildConfig = true }
    // fdroid: store build without the OTA self-updater; github: signed APK with the OTA channel (android/OTA.md).
    flavorDimensions += "distribution"
    productFlavors {
        create("fdroid") {
            dimension = "distribution"
            buildConfigField("boolean", "OTA_ENABLED", "false")
        }
        create("github") {
            dimension = "distribution"
            buildConfigField("boolean", "OTA_ENABLED", "true")
        }
    }
    // Reproducible builds: no Google dependency blob in the APK and no VCS info (both vary with the build checkout).
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
    val releaseSigningEnv = listOf(
        "RADICODEX_KEYSTORE_PATH",
        "RADICODEX_KEYSTORE_PASSWORD",
        "RADICODEX_KEY_ALIAS",
        "RADICODEX_KEY_PASSWORD"
    ).associateWith { System.getenv(it).orEmpty() }
    val releaseSigningReady = releaseSigningEnv.values.all { it.isNotEmpty() }
    signingConfigs {
        if (releaseSigningReady) {
            create("release") {
                storeFile = file(releaseSigningEnv.getValue("RADICODEX_KEYSTORE_PATH"))
                storePassword = releaseSigningEnv.getValue("RADICODEX_KEYSTORE_PASSWORD")
                keyAlias = releaseSigningEnv.getValue("RADICODEX_KEY_ALIAS")
                keyPassword = releaseSigningEnv.getValue("RADICODEX_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        getByName("release") {
            vcsInfo.include = false
            if (releaseSigningReady) signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    testOptions {
        unitTests.isReturnDefaultValues = false
        unitTests.isIncludeAndroidResources = true
    }
}
// The regional template datasets live once in data/channel-templates; they are copied at build time, never committed under assets.
val syncChannelTemplates by tasks.registering(Sync::class) {
    from(rootProject.projectDir.resolve("../data/channel-templates")) {
        include("*.json")
        exclude("*-passes.json", "satellites.json")
    }
    into(layout.buildDirectory.dir("generated/channelTemplates/channel-templates"))
}
android.sourceSets.getByName("main").assets.srcDir(layout.buildDirectory.dir("generated/channelTemplates"))
tasks.configureEach {
    if (name.startsWith("merge") && name.endsWith("Assets")) dependsOn(syncChannelTemplates)
    if (name.startsWith("lintVitalAnalyze") || name.startsWith("generate") && name.endsWith("LintReportModel")) dependsOn(syncChannelTemplates)
}
dependencies {
    implementation("com.github.mik3y:usb-serial-for-android:3.9.0")
    implementation("org.mozilla:rhino:1.7.15")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.14.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
