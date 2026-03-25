# Proguard rules for app_passageiro

# Keep Flutter related code
-keep class io.flutter.** { *; }
-keep class io.flutter.embedding.** { *; }

# Keep Google Maps and Play Services
-keep class com.google.android.gms.** { *; }
-keep class com.google.maps.** { *; }
-keep class com.google.android.maps.** { *; }

# Keep all model classes
-keepclasseswithmembernames class * {
    native <methods>;
}

# Preserve native methods
-keepclasseswithmembers class * {
    *** *(...);
}

# Prevent obfuscation of Maps
-dontwarn com.google.android.gms.**
-dontwarn com.google.maps.**

