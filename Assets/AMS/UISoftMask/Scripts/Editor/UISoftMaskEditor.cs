#if UNITY_EDITOR
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEditor.U2D;
using UnityEngine.U2D;
using UnityEngine.Rendering;

namespace AMS.UI.SoftMask
{
    using static UISoftMaskUtils;

    [CustomEditor(typeof(UISoftMask), true), CanEditMultipleObjects]
    public class UISoftMaskEditor : Editor
    {
        private UISoftMask m_Target;

        private SerializedProperty m_Script;
        private SerializedProperty m_IncludedShaders;

        private SerializedObject m_GraphicsSettingsObject;

        public List<string> m_ExcludeProperties = new List<string> { "m_Script" };

        private const string m_PixelsPerUnitMultiplierProperty = "m_PixelsPerUnitMultiplier";
        private const string m_ScriptProperty = "m_Script";

        private const string m_AtlasTightModeWarningMessage =
            "\nSprite mask is part of an atlas and uses a 'Tight' packing mode. To prevent rendering outbound seams please set packing mode to 'Full Rect'.\n";

        private const string m_OverrideMaterialMessage =
            " doesn't support UI Soft Mask. Please add support to it or select a different shader.\n";

        private const string m_InvalidFontMaterialMessage =
            " doesn't support UI Soft Mask.\nPlease add support to it or select a different shader.\n\nHave you imported TMP_SoftMaskSupport package?\n" +
            "For TMP support please import package at plugin's folder 'Resources/Packages/TMP_SoftMaskSupport.unitypackage'.\n" +
            "Supported shaders:\n-TMP_SDF;\n-TMP_SDF_Mobile;\n";

        private const string m_IncludeShaderWarningMessage =
            "\nIt's required to include AMS shaders into 'Project Settings > Graphics > Always Included Shaders' to prevent Unity skip variants/shader from builds.\n";

        private void OnEnable()
        {
            m_Target = target as UISoftMask;
            m_Script = serializedObject.FindProperty(m_ScriptProperty);

            var graphicsSettingsAsset =
                AssetDatabase.LoadAssetAtPath<GraphicsSettings>("ProjectSettings/GraphicsSettings.asset");
            m_GraphicsSettingsObject = new SerializedObject(graphicsSettingsAsset);
            m_IncludedShaders = m_GraphicsSettingsObject.FindProperty("m_AlwaysIncludedShaders");
        }

        public override void OnInspectorGUI()
        {
            serializedObject.Update();

            EditorGUI.BeginDisabledGroup(true);
            EditorGUILayout.PropertyField(m_Script);
            EditorGUI.EndDisabledGroup();

            switch (m_Target.maskUV)
            {
                case MaskUV.Simple:
                    if (!m_ExcludeProperties.Contains(m_PixelsPerUnitMultiplierProperty))
                        m_ExcludeProperties.Add(m_PixelsPerUnitMultiplierProperty);
                    break;

                case MaskUV.Sliced:
                    if (m_ExcludeProperties.Contains(m_PixelsPerUnitMultiplierProperty))
                        m_ExcludeProperties.Remove(m_PixelsPerUnitMultiplierProperty);
                    break;
            }

            DrawPropertiesExcluding(serializedObject, m_ExcludeProperties.ToArray());

            CheckAtlasPackingMode();
            CheckValidTargetMaterial();
            CheckIncludedShaders();
            CheckFontMaterials();

            serializedObject.ApplyModifiedProperties();
        }

        private void CheckValidTargetMaterial()
        {
            if (m_Target.overrideMaterial is var overrideMaterial && overrideMaterial &&
                !MaterialHasSoftMask(overrideMaterial))
            {
                EditorGUILayout.Space(EditorGUIUtility.singleLineHeight);
                EditorGUILayout.BeginHorizontal();
                EditorGUILayout.HelpBox("\n" + overrideMaterial.name + m_OverrideMaterialMessage, MessageType.Warning);
                EditorGUILayout.EndHorizontal();
            }
        }

        private void CheckAtlasPackingMode()
        {
            if (m_Target.mask is var sprite && sprite && sprite.packed)
            {
                var assetPath = AssetDatabase.GetAssetPath(sprite);
                var textureImporter = AssetImporter.GetAtPath(assetPath) as TextureImporter;

                if (!textureImporter)
                    return;

                var textureSettings = new TextureImporterSettings();
                textureImporter.ReadTextureSettings(textureSettings);

                if (textureSettings.spriteMeshType == SpriteMeshType.Tight)
                {
                    EditorGUILayout.Space(EditorGUIUtility.singleLineHeight);
                    EditorGUILayout.BeginHorizontal();
                    if (GUILayout.Button("Fix", GUILayout.Width(50), GUILayout.ExpandHeight(true)))
                    {
                        textureSettings.spriteMeshType = SpriteMeshType.FullRect;
                        textureImporter.SetTextureSettings(textureSettings);
                        textureImporter.SaveAndReimport();
                        UpdateAtlas(sprite);
                    }

                    EditorGUILayout.HelpBox(m_AtlasTightModeWarningMessage, MessageType.Warning);
                    EditorGUILayout.EndHorizontal();
                }
            }
        }

        private void CheckFontMaterials()
        {
            var invalidFontMaterials = m_Target.invalidFontMaterials;
            foreach (var invalidMaterial in invalidFontMaterials.Where(invalidMaterial =>
                         !MaterialHasSoftMask(invalidMaterial)))
            {
                EditorGUILayout.Space(EditorGUIUtility.singleLineHeight);
                EditorGUILayout.BeginHorizontal();
                EditorGUILayout.HelpBox($"\nTMP material [{invalidMaterial.name}]" + m_InvalidFontMaterialMessage,
                    MessageType.Warning);
                EditorGUILayout.EndHorizontal();
                break;
            }
        }

        private void CheckIncludedShaders()
        {
            m_GraphicsSettingsObject.Update();

            var shaders = new List<Shader>();
            for (var i = 0; i < m_IncludedShaders.arraySize; i++)
            {
                if (m_IncludedShaders.GetArrayElementAtIndex(i).objectReferenceValue is Shader shader && shader)
                    shaders.Add(shader);
            }

            if (shaders.Contains(s_SoftMaskShader) && shaders.Contains(s_SoftMaskBlitShader))
                return;

            EditorGUILayout.Space(EditorGUIUtility.singleLineHeight);
            EditorGUILayout.BeginHorizontal();
            if (GUILayout.Button("Fix", GUILayout.Width(50), GUILayout.ExpandHeight(true)))
                ForceIncludeShaders();
            EditorGUILayout.HelpBox(m_IncludeShaderWarningMessage, MessageType.Error);
            EditorGUILayout.EndHorizontal();
        }

        private void UpdateAtlas(Sprite sprite)
        {
            AssetDatabase.FindAssets("t:spriteatlas").ToList().ForEach(guid =>
            {
                var atlasPath = AssetDatabase.GUIDToAssetPath(guid);
                var atlas = AssetDatabase.LoadAssetAtPath<SpriteAtlas>(atlasPath);
                var sprites = atlas.GetPackables().ToList()
                    .Select(o => AssetDatabase.LoadAssetAtPath<Sprite>(AssetDatabase.GetAssetPath(o)));

                if (sprites.Contains(sprite))
                {
                    var spriteAtlasImporter = AssetImporter.GetAtPath(atlasPath) as SpriteAtlasImporter;
                    spriteAtlasImporter?.SaveAndReimport();
                }
            });

            m_Target.UpdateMaskSetup();
        }
    }
}
#endif