from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="current_academic",
            field=models.CharField(
                blank=True, max_length=150, verbose_name="Current Academic"),
        ),
        migrations.AddField(
            model_name="user",
            name="date_of_birth",
            field=models.DateField(blank=True, null=True,
                                   verbose_name="Birth of Date"),
        ),
        migrations.AddField(
            model_name="user",
            name="enrolled_status",
            field=models.BooleanField(
                default=True, verbose_name="Enrolled Status"),
        ),
        migrations.AddField(
            model_name="user",
            name="gender",
            field=models.CharField(
                blank=True,
                choices=[("male", "Male"), ("female", "Female"),
                         ("other", "Other")],
                max_length=10,
                verbose_name="Gender",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="profile_photo",
            field=models.ImageField(
                blank=True, null=True, upload_to="profile_photos/", verbose_name="Profile Photo"),
        ),
    ]
